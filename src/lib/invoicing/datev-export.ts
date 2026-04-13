// ============================================
// DATEV Export
// Exports invoices in DATEV format for German accountants
// Supports CSV (EXTF) format
// ============================================

import { createAdminClient } from '@/lib/supabase/server';
import { Invoice } from './types';

interface DATEVLine {
  abrechnungsperiode: string;      // YYYYMM
  leistungsdatum: string;           // DDMMYY
  leistungsbeschreibung: string;    // max 30 chars
  bruttobetrag: number;              // in cents, with sign (+/-)
  waehrung: string;
  steuersatz: string;               // e.g. "19,00"
  konto: string;                    // customer account number
  gegenkonto: string;               // revenue account
  buchungstext: string;            // max 30 chars
  rechnungsnummer: string;
  rechnungsdatum: string;          // DDMMYY
}

interface DATEVExportResult {
  success: boolean;
  data?: Buffer;
  filename?: string;
  recordCount?: number;
  message?: string;
}

// German revenue account mapping (example - should be configurable)
const REVENUE_ACCOUNTS: Record<string, string> = {
  standard: '4200',
  cleaning: '4200',
  maintenance: '4220',
  repairs: '4230',
  consulting: '4300',
  other: '4900',
};

function getRevenueAccount(serviceType?: string | null): string {
  if (!serviceType) return REVENUE_ACCOUNTS.standard;
  return REVENUE_ACCOUNTS[serviceType.toLowerCase()] || REVENUE_ACCOUNTS.other;
}

function formatDateForDATEV(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  } catch {
    return '000000';
  }
}

function formatPeriod(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '000000';
  }
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text;
}

export async function exportDATEV(
  dateFrom: string,
  dateTo: string,
  tenantId: string,
  format: 'csv' = 'csv'
): Promise<DATEVExportResult> {
  try {
    const supabase = createAdminClient();

    // Fetch paid/sent invoices in date range for THIS TENANT ONLY
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        debtor:debtors(*),
        items:invoice_items(*)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['paid', 'sent', 'partial'])
      .gte('issue_date', dateFrom)
      .lte('issue_date', dateTo)
      .order('issue_date');

    if (error) throw error;

    if (!invoices || invoices.length === 0) {
      return {
        success: false,
        message: 'Keine Rechnungen im ausgewählten Zeitraum gefunden.',
      };
    }

    const lines: DATEVLine[] = [];

    for (const invoice of invoices) {
      const items = invoice.items || [];
      const debtor = invoice.debtor;
      const customerAccount = debtor?.tax_id || debtor?.id?.slice(0, 9) || '10001';

      if (items.length === 0) {
        // Single line for invoice without items
        const line: DATEVLine = {
          abrechnungsperiode: formatPeriod(invoice.issue_date),
          leistungsdatum: formatDateForDATEV(invoice.issue_date),
          leistungsbeschreibung: truncate(`Rechnung ${invoice.invoice_number}`, 30),
          bruttobetrag: invoice.total_amount_cents, // Positive for revenue
          waehrung: invoice.currency || 'EUR',
          steuersatz: String(invoice.tax_rate).replace('.', ','),
          konto: customerAccount,
          gegenkonto: REVENUE_ACCOUNTS.standard,
          buchungstext: truncate(invoice.order_reference || invoice.invoice_number, 30),
          rechnungsnummer: invoice.invoice_number,
          rechnungsdatum: formatDateForDATEV(invoice.issue_date),
        };
        lines.push(line);
      } else {
        // One line per item
        for (const item of items) {
          const revenueAccount = REVENUE_ACCOUNTS.standard; // Could be item-specific

          const line: DATEVLine = {
            abrechnungsperiode: formatPeriod(invoice.issue_date),
            leistungsdatum: item.service_date ? formatDateForDATEV(item.service_date) : formatDateForDATEV(invoice.issue_date),
            leistungsbeschreibung: truncate(item.service_description || 'Dienstleistung', 30),
            bruttobetrag: item.net_amount_cents, // Net amount
            waehrung: invoice.currency || 'EUR',
            steuersatz: String(item.tax_rate || invoice.tax_rate || 19).replace('.', ','),
            konto: customerAccount,
            gegenkonto: revenueAccount,
            buchungstext: truncate(`${invoice.invoice_number} - ${item.service_description || ''}`, 30),
            rechnungsnummer: invoice.invoice_number,
            rechnungsdatum: formatDateForDATEV(invoice.issue_date),
          };
          lines.push(line);
        }
      }
    }

    if (format === 'csv') {
      return generateCSV(lines);
    }

    return generateEXTF(lines);
  } catch (error: any) {
    console.error('Error exporting DATEV:', error);
    return { success: false, message: error.message };
  }
}

function generateCSV(lines: DATEVLine[]): DATEVExportResult {
  const header = [
    'Abrechnungsperiode',
    'Leistungsdatum',
    'Leistungsbeschreibung',
    'Bruttobetrag',
    'Währung',
    'Steuersatz',
    'Konto',
    'Gegenkonto',
    'Buchungstext',
    'Rechnungsnummer',
    'Rechnungsdatum',
  ];

  const rows = lines.map(line => [
    line.abrechnungsperiode,
    line.leistungsdatum,
    line.leistungsbeschreibung,
    (line.bruttobetrag / 100).toFixed(2),
    line.waehrung,
    line.steuersatz,
    line.konto,
    line.gegenkonto,
    line.buchungstext,
    line.rechnungsnummer,
    line.rechnungsdatum,
  ]);

  const csv = [
    header.join(';'),
    ...rows.map(row => row.join(';')),
  ].join('\r\n');

  // BOM for UTF-8
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const content = Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);

  return {
    success: true,
    data: content,
    filename: `DATEV_Export_${new Date().toISOString().split('T')[0]}.csv`,
    recordCount: lines.length,
  };
}

function generateEXTF(lines: DATEVLine[]): DATEVExportResult {
  // DATEV EXTENDED FORMAT (EXTF) for direct import
  // Header format: DKABA + version + import date + export date

  const header = [
    'EXTF',                                    // Format identifier
    '120',                                     // Version (DATEV format 120)
    '',                                        // Reserved
    '',                                        // Reserved
  ].join('');

  const meta = [
    formatDateForDATEV(new Date().toISOString()),  // Export date
    formatDateForDATEV(new Date().toISOString()),  // Creation date
    '',                                              // Reserved
    String(lines.length).padStart(7, '0'),           // Number of data records
  ].join('');

  // Data records as CSV with semicolon
  const dataLines = lines.map(line => [
    line.abrechnungsperiode,
    line.leistungsdatum,
    line.leistungsbeschreibung,
    (line.bruttobetrag / 100).toFixed(2),
    line.waehrung,
    line.steuersatz,
    line.konto,
    line.gegenkonto,
    line.buchungstext,
    line.rechnungsnummer,
    line.rechnungsdatum,
  ].join(';'));

  const content = Buffer.from(
    [header, meta, ...dataLines].join('\r\n'),
    'utf-8'
  );

  return {
    success: true,
    data: content,
    filename: `DATEV_Export_${new Date().toISOString().split('T')[0]}.txt`,
    recordCount: lines.length,
  };
}

// Alternative: Generate ZUGFeRD (UBL/XML format for European e-invoicing)
export async function exportZUGFeRD(
  invoiceId: string
): Promise<DATEVExportResult> {
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      debtor:debtors(*),
      items:invoice_items(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    return { success: false, message: 'Rechnung nicht gefunden.' };
  }

  return generateZUGFeRDXML(invoice);
}

function generateZUGFeRDXML(invoice: any): DATEVExportResult {
  // ZUGFeRD 2.1 / UBL-like structure
  const debtor = invoice.debtor || {};
  const items = invoice.items || [];

  const issueDate = invoice.issue_date
    ? new Date(invoice.issue_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Build line items XML
  const lineItemsXML = items.map((item: any, idx: number) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:LineID>${idx + 1}</ram:LineID>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXML(item.service_description || 'Dienstleistung')}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:QuantityUnitCode>${escapeXML(item.unit || 'HUR')}</ram:QuantityUnitCode>
      <ram:LineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.unit_price_cents / 100).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:LineTradeAgreement>
      <ram:LineTradeDelivery>
        <ram:BilledQuantity>${item.quantity}</ram:BilledQuantity>
      </ram:LineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.tax_rate || invoice.tax_rate || 19}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${(item.net_amount_cents / 100).toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXML(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate.replace(/-/g, '')}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXML}
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXML(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:InvoiceIssuerReference>${escapeXML(invoice.order_reference || '')}</ram:InvoiceIssuerReference>
      <ram:PayeeParty>
        <ram:Name>${escapeXML(debtor.billing_name || 'Kunde')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:StreetName>${escapeXML(debtor.billing_street || '')}</ram:StreetName>
          <ram:PostcodeCode>${escapeXML(debtor.billing_postal_code || '')}</ram:PostcodeCode>
          <ram:CityName>${escapeXML(debtor.billing_city || '')}</ram:CityName>
          <ram:CountryID>${debtor.billing_country || 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:PayeeParty>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${(invoice.net_amount_cents / 100).toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.tax_amount_cents / 100).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${(invoice.total_amount_cents / 100).toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${(invoice.total_amount_cents / 100).toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:SpecifiedTradeTax>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${invoice.tax_rate || 19}</ram:RateApplicablePercent>
        <ram:TaxableAmount>${(invoice.net_amount_cents / 100).toFixed(2)}</ram:TaxableAmount>
        <ram:TaxAmount>${(invoice.tax_amount_cents / 100).toFixed(2)}</ram:TaxAmount>
      </ram:SpecifiedTradeTax>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  const content = Buffer.from(xml, 'utf-8');

  return {
    success: true,
    data: content,
    filename: `ZUGFeRD_${invoice.invoice_number.replace(/\//g, '-')}.xml`,
    recordCount: items.length,
  };
}

function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
