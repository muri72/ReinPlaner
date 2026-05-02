// ============================================
// X-Rechnung Export (German B2B E-Invoice)
// Implements EN 16931 CII / Profile "Extended Minimum" (XRechnung)
// For German public sector + B2B mandatory e-invoicing
// ============================================

import { createAdminClient } from '@/lib/supabase/server';
import { Invoice } from './types';
import { getTenantById } from '@/lib/tenant/registry';

interface XRechnungResult {
  success: boolean;
  data?: Buffer;
  filename?: string;
  message?: string;
}

function escapeXML(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateYYYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split('T')[0].replace(/-/g, '');
  return dateStr.replace(/-/g, '');
}

interface SellerParty {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  bankIban?: string;
  bankBic?: string;
  bankName?: string;
  email?: string;
}

async function getSellerParty(invoice: Invoice): Promise<SellerParty> {
  const tenantId = invoice.tenant_id;

  if (tenantId) {
    const tenant = await getTenantById(tenantId);
    if (tenant) {
      return {
        name: tenant.settings?.branding?.company_name || tenant.name || 'Ihr Unternehmen',
        street: tenant.settings?.address?.street || '',
        postalCode: tenant.settings?.address?.postal_code || '',
        city: tenant.settings?.address?.city || '',
        country: tenant.settings?.address?.country || 'DE',
        vatId: tenant.settings?.vat_id || '',
        bankIban: tenant.settings?.bank?.iban,
        bankBic: tenant.settings?.bank?.bic,
        bankName: tenant.settings?.bank?.name,
        email: tenant.settings?.email,
      };
    }
  }

  return {
    name: 'Ihr Unternehmen',
    street: '',
    postalCode: '',
    city: '',
    country: 'DE',
    vatId: '',
  };
}

export async function exportXRechnung(invoiceId: string): Promise<XRechnungResult> {
  try {
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

    const xml = await generateXRechnungXML(invoice);

    return {
      success: true,
      data: Buffer.from(xml, 'utf-8'),
      filename: `XRechnung_${invoice.invoice_number.replace(/\//g, '-')}.xml`,
    };
  } catch (error: any) {
    console.error('Error exporting X-Rechnung:', error);
    return { success: false, message: error.message };
  }
}

export async function generateXRechnungXML(invoice: Invoice): Promise<string> {
  const debtor = invoice.debtor;
  const items = invoice.items || [];

  const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
  const dueDate = invoice.due_date || issueDate;

  const seller = await getSellerParty(invoice);

  // Generate unique invoice ID for XRechnung
  const invoiceId = `RE-${invoice.invoice_number}-${issueDate.replace(/-/g, '')}`;

  // Buyer GLN (if available) or use VAT ID
  const buyerId = debtor?.vat_id || debtor?.tax_id || `DE${debtor?.billing_postal_code || '00000'}`;

  // Line items
  const lineItemsXML = items.map((item, idx) => {
    const lineNet = (item.net_amount_cents / 100).toFixed(2);
    const unitPrice = (item.unit_price_cents / 100).toFixed(2);
    const taxRate = (item.tax_rate || invoice.tax_rate || 19).toFixed(2);
    const lineTax = (item.tax_amount_cents / 100).toFixed(2);
    const grossAmount = ((item.net_amount_cents + item.tax_amount_cents) / 100).toFixed(2);

    return `
    <ram:InvoiceLine>
      <ram:ID>${idx + 1}</ram:ID>
      <ram:Note>${escapeXML(item.service_description)}</ram:Note>
      <ram:invoicedQuantity unitCode="HUR">${item.quantity}</ram:invoicedQuantity>
      <ram:LineExtensionAmount currencyID="${invoice.currency || 'EUR'}">${lineNet}</ram:LineExtensionAmount>
      <ram:TaxPerLine>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
      </ram:TaxPerLine>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXML(item.service_description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${unitPrice}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
        <ram:GrossPriceProductTradePrice>
          <ram:ChargeAmount>${(parseFloat(unitPrice) * (1 + parseFloat(taxRate) / 100)).toFixed(2)}</ram:ChargeAmount>
        </ram:GrossPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
          <ram:TaxableAmount>${lineNet}</ram:TaxableAmount>
          <ram:TaxAmount>${lineTax}</ram:TaxAmount>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineNet}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:InvoiceLine>`;
  }).join('');

  const netAmount = (invoice.net_amount_cents / 100).toFixed(2);
  const taxAmount = (invoice.tax_amount_cents / 100).toFixed(2);
  const totalAmount = (invoice.total_amount_cents / 100).toFixed(2);
  const paidAmount = (invoice.paid_amount_cents / 100).toFixed(2);
  const taxRate = (invoice.tax_rate || 19).toFixed(2);
  const remainingAmount = ((invoice.total_amount_cents - invoice.paid_amount_cents) / 100).toFixed(2);

  // Seller address
  const sellerAddressXML = seller.street && seller.postalCode && seller.city ? `
      <ram:PostalTradeAddress>
        <ram:StreetName>${escapeXML(seller.street)}</ram:StreetName>
        <ram:PostcodeCode>${escapeXML(seller.postalCode)}</ram:PostcodeCode>
        <ram:CityName>${escapeXML(seller.city)}</ram:CityName>
        <ram:CountryID>${escapeXML(seller.country)}</ram:CountryID>
      </ram:PostalTradeAddress>` : '';

  // Buyer address
  const buyerAddressXML = debtor?.billing_street ? `
      <ram:PostalTradeAddress>
        <ram:StreetName>${escapeXML(debtor.billing_street)}</ram:StreetName>
        <ram:PostcodeCode>${escapeXML(debtor.billing_postal_code)}</ram:PostcodeCode>
        <ram:CityName>${escapeXML(debtor.billing_city)}</ram:CityName>
        <ram:CountryID>${debtor.billing_country || 'DE'}</ram:CountryID>
      </ram:PostalTradeAddress>` : '';

  // VAT registration
  const sellerVatXML = seller.vatId ? `
      <ram:TaxRegistration>
        <ram:ID schemeID="VA">${escapeXML(seller.vatId)}</ram:ID>
      </ram:TaxRegistration>` : '';

  const buyerVatXML = debtor?.vat_id ? `
      <ram:TaxRegistration>
        <ram:ID schemeID="VA">${escapeXML(debtor.vat_id)}</ram:ID>
      </ram:TaxRegistration>` : '';

  // SEPA payment means
  const sepaXML = seller.bankIban ? `
      <!-- SEPA Bank Details -->
      <ram:CreditorFinancialAccount>
        <ram:IBANID>${escapeXML(seller.bankIban)}</ram:IBANID>
        ${seller.bankName ? `<ram:BankName>${escapeXML(seller.bankName)}</ram:BankName>` : ''}
      </ram:CreditorFinancialAccount>
      ${seller.bankBic ? `<ram:CreditorFinancialInstitution><ram:BICID>${escapeXML(seller.bankBic)}</ram:BICID></ram:CreditorFinancialInstitution>` : ''}` : '';

  // Allowances/Charges on document level (none for now)
  const allowanceChargesXML = '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- XRechnung (EN 16931 CII / Profile ExtendedMinimum) -->
<rsm:CrossIndustryInvoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">

  <!-- ExchangedDocumentContext -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
    <ram:BusinessInvolvedParty>
      <ram:ID>urn:cen.eu:en16931:profile:x:1a</ram:ID>
    </ram:BusinessInvolvedParty>
  </rsm:ExchangedDocumentContext>

  <!-- ExchangedDocument -->
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXML(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDateYYYYMMDD(issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${invoice.notes ? `<ram:Notes><ram:Content>${escapeXML(invoice.notes)}</ram:Content></ram:Notes>` : ''}
    <ram:IncludedNote>
      <ram:Content>Zahlbar innerhalb von ${debtor?.payment_terms_days || 30} Tagen.</ram:Content>
      <ram:SubjectCode>REG</ram:SubjectCode>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>

  <!-- SupplyChainTradeTransaction -->
  <rsm:SupplyChainTradeTransaction>

    <!-- LINE ITEMS -->
    ${lineItemsXML}

    <!-- ApplicableHeaderTradeAgreement -->
    <ram:ApplicableHeaderTradeAgreement>
      <!-- Seller -->
      <ram:SellerTradeParty>
        <ram:ID>${escapeXML(seller.vatId || invoice.tenant_id || 'UNKNOWN')}</ram:ID>
        <ram:Name>${escapeXML(seller.name)}</ram:Name>
        ${sellerAddressXML}
        ${sellerVatXML}
        ${seller.email ? `<ram:URIUniversalCommunication><ram:URIID>mailto:${escapeXML(seller.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      </ram:SellerTradeParty>

      <!-- Buyer -->
      ${debtor ? `
      <ram:BuyerTradeParty>
        <ram:ID>${escapeXML(buyerId)}</ram:ID>
        <ram:Name>${escapeXML(debtor.billing_name)}</ram:Name>
        ${buyerAddressXML}
        ${buyerVatXML}
        ${debtor.invoice_email ? `<ram:URIUniversalCommunication><ram:URIID>mailto:${escapeXML(debtor.invoice_email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      </ram:BuyerTradeParty>` : ''}

      <!-- BuyerOrderReferencedDocument -->
      ${invoice.order_reference ? `
      <ram:BuyerOrderReferencedDocument>
        <ram:ID>${escapeXML(invoice.order_reference)}</ram:ID>
        <ram:IssueDateTime><udt:DateTimeString format="102">${formatDateYYYYMMDD(issueDate)}</udt:DateTimeString></ram:IssueDateTime>
      </ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>

    <!-- ApplicableHeaderTradeDelivery -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(invoice.delivery_date_start || issueDate)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- ApplicableHeaderTradeSettlement -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXML(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>

      ${sepaXML}

      <!-- ApplicableTradeTax (Tax breakdown by rate) -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${taxAmount}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
        <ram:TaxableAmount>${netAmount}</ram:TaxableAmount>
      </ram:ApplicableTradeTax>

      <!-- SpecifiedTradeSettlementHeaderMonetarySummation -->
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${netAmount}</ram:LineTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${taxAmount}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalAmount}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${remainingAmount}</ram:DuePayableAmount>
        ${invoice.paid_amount_cents > 0 ? `<ram:PaidAmount>${paidAmount}</ram:PaidAmount>` : ''}
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

      <!-- Payment terms -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
        <ram:Description>Zahlbar bis zum ${dueDate}</ram:Description>
      </ram:SpecifiedTradePaymentTerms>

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;
}