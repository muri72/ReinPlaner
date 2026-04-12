// ============================================
// ZUGFeRD Export
// Generates ZUGFeRD 2.1 (EN 16931) compliant XML invoices
// ============================================

import { createAdminClient } from '@/lib/supabase/server';
import { Invoice } from './types';
import { formatCurrency } from './invoice-service';

interface ZUGFeRDResult {
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

function formatDateCCYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  return dateStr;
}

export async function exportZUGFeRD(invoiceId: string): Promise<ZUGFeRDResult> {
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

    const xml = generateZUGFeRD21XML(invoice);

    return {
      success: true,
      data: Buffer.from(xml, 'utf-8'),
      filename: `ZUGFeRD_${invoice.invoice_number.replace(/\//g, '-')}.xml`,
    };
  } catch (error: any) {
    console.error('Error exporting ZUGFeRD:', error);
    return { success: false, message: error.message };
  }
}

export function generateZUGFeRD21XML(invoice: Invoice): string {
  const debtor = invoice.debtor;
  const items = invoice.items || [];

  const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
  const dueDate = invoice.due_date || issueDate;
  const deliveryStart = invoice.delivery_date_start || issueDate;
  const deliveryEnd = invoice.delivery_date_end || deliveryStart;

  // Build line items
  const lineItems = items.map((item, idx) => {
    const lineNet = (item.net_amount_cents / 100).toFixed(2);
    const lineTax = (item.tax_amount_cents / 100).toFixed(2);
    const unitPrice = (item.unit_price_cents / 100).toFixed(2);
    const taxRate = (item.tax_rate || invoice.tax_rate || 19).toFixed(2);

    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:LineID>${idx + 1}</ram:LineID>
      <ram:Note>${escapeXML(item.service_description)}</ram:Note>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXML(item.service_description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${unitPrice}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineNet}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('');

  const netAmount = (invoice.net_amount_cents / 100).toFixed(2);
  const taxAmount = (invoice.tax_amount_cents / 100).toFixed(2);
  const totalAmount = (invoice.total_amount_cents / 100).toFixed(2);
  const paidAmount = (invoice.paid_amount_cents / 100).toFixed(2);
  const taxRate = (invoice.tax_rate || 19).toFixed(2);

  // Seller address
  const sellerAddress = `
        <ram:PostalTradeAddress>
          <ram:StreetName>Musterstraße 1</ram:StreetName>
          <ram:PostcodeCode>20095</ram:PostcodeCode>
          <ram:CityName>Hamburg</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>`;

  // Buyer address
  const buyerAddress = debtor ? `
        <ram:PostalTradeAddress>
          <ram:StreetName>${escapeXML(debtor.billing_street)}</ram:StreetName>
          <ram:PostcodeCode>${escapeXML(debtor.billing_postal_code)}</ram:PostcodeCode>
          <ram:CityName>${escapeXML(debtor.billing_city)}</ram:CityName>
          <ram:CountryID>${debtor.billing_country || 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>` : '';

  // Payment terms
  const paymentDueDays = debtor?.payment_terms_days || 30;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">

  <!-- HEADER -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXML(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDateYYYYMMDD(issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${invoice.notes ? `<ram:Notes><ram:Content>${escapeXML(invoice.notes)}</ram:Content></ram:Notes>` : ''}
  </rsm:ExchangedDocument>

  <!-- TRANSACTION -->
  <rsm:SupplyChainTradeTransaction>

    <!-- LINE ITEMS -->
    ${lineItems}

    <!-- HEADER AGREEMENT -->
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>ReinPlaner GmbH</ram:Name>
        ${sellerAddress}
        <ram:TaxRegistration>
          <ram:ID schemeID="VA">DE123456789</ram:ID>
        </ram:TaxRegistration>
      </ram:SellerTradeParty>

      ${debtor ? `
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXML(debtor.billing_name)}</ram:Name>
        ${buyerAddress}
        ${debtor.vat_id ? `<ram:TaxRegistration><ram:ID schemeID="VA">${escapeXML(debtor.vat_id)}</ram:ID></ram:TaxRegistration>` : ''}
      </ram:BuyerTradeParty>` : ''}

      ${invoice.order_reference ? `
      <ram:BuyerOrderReferencedDocument>
        <ram:ID>${escapeXML(invoice.order_reference)}</ram:ID>
      </ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>

    <!-- HEADER DELIVERY -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(deliveryStart)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- HEADER SETTLEMENT -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXML(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${netAmount}</ram:LineTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${taxAmount}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalAmount}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalAmount}</ram:DuePayableAmount>
        ${invoice.paid_amount_cents > 0 ? `<ram:PaidAmount>${paidAmount}</ram:PaidAmount>` : ''}
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

      <!-- Tax breakdown -->
      <ram:ApplicableTradeTax>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
        <ram:TaxableAmount>${netAmount}</ram:TaxableAmount>
        <ram:TaxAmount>${taxAmount}</ram:TaxAmount>
      </ram:ApplicableTradeTax>

      <!-- Payment terms -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
        <ram:Description>Zahlbar innerhalb von ${paymentDueDays} Tagen</ram:Description>
      </ram:SpecifiedTradePaymentTerms>

      ${(debtor?.bank_iban) ? `
      <!-- Bank info -->
      <ram:CreditorFinancialAccount>
        <ram:IBANID>${escapeXML(debtor.bank_iban)}</ram:IBANID>
        <ram:BankName>${escapeXML(debtor.bank_name)}</ram:BankName>
      </ram:CreditorFinancialAccount>
      ${debtor?.bank_bic ? `<ram:CreditorFinancialInstitution><ram:BICID>${escapeXML(debtor.bank_bic)}</ram:BICID></ram:CreditorFinancialInstitution>` : ''}
      ` : ''}

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;
}
