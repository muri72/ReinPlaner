// ============================================
// ZUGFeRD Export
// Generates ZUGFeRD 2.1 (EN 16931) compliant XML invoices
// ============================================

import { createAdminClient } from '@/lib/supabase/server';
import { Invoice } from './types';
import { getTenantById } from '@/lib/tenant/registry';

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
  // Try to get tenant data
  const tenantId = invoice.tenant_id;
  let tenantName = 'Ihr Unternehmen';
  let tenantStreet = '';
  let tenantPostalCode = '';
  let tenantCity = '';
  let tenantCountry = 'DE';
  let tenantVatId = '';
  let tenantBankIban: string | undefined;
  let tenantBankBic: string | undefined;
  let tenantBankName: string | undefined;
  let tenantEmail: string | undefined;

  if (tenantId) {
    const tenant = await getTenantById(tenantId);
    if (tenant) {
      tenantName = tenant.settings?.branding?.company_name || tenant.name || 'Ihr Unternehmen';
      tenantStreet = tenant.settings?.address?.street || '';
      tenantPostalCode = tenant.settings?.address?.postal_code || '';
      tenantCity = tenant.settings?.address?.city || '';
      tenantCountry = tenant.settings?.address?.country || 'DE';
      tenantVatId = tenant.settings?.vat_id || '';
      tenantBankIban = tenant.settings?.bank?.iban;
      tenantBankBic = tenant.settings?.bank?.bic;
      tenantBankName = tenant.settings?.bank?.name;
      tenantEmail = tenant.settings?.email;
    }
  }

  // Fallback to hardcoded defaults only when no tenant data available
  return {
    name: tenantName || 'Ihr Unternehmen',
    street: tenantStreet || '',
    postalCode: tenantPostalCode || '',
    city: tenantCity || '',
    country: tenantCountry || 'DE',
    vatId: tenantVatId || '',
    bankIban: tenantBankIban,
    bankBic: tenantBankBic,
    bankName: tenantBankName,
    email: tenantEmail,
  };
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

    const xml = await generateZUGFeRD21XML(invoice);

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

export async function generateZUGFeRD21XML(invoice: Invoice): Promise<string> {
  const debtor = invoice.debtor;
  const items = invoice.items || [];

  const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
  const dueDate = invoice.due_date || issueDate;
  const deliveryStart = invoice.delivery_date_start || issueDate;

  // Get seller party from tenant
  const seller = await getSellerParty(invoice);

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

  // Seller address — only include if we have real data
  const sellerAddressXML = seller.street && seller.postalCode && seller.city ? `
        <ram:PostalTradeAddress>
          <ram:StreetName>${escapeXML(seller.street)}</ram:StreetName>
          <ram:PostcodeCode>${escapeXML(seller.postalCode)}</ram:PostcodeCode>
          <ram:CityName>${escapeXML(seller.city)}</ram:CityName>
          <ram:CountryID>${escapeXML(seller.country)}</ram:CountryID>
        </ram:PostalTradeAddress>` : '';

  // VAT ID only if available
  const sellerVatXML = seller.vatId ? `
        <ram:TaxRegistration>
          <ram:ID schemeID="VA">${escapeXML(seller.vatId)}</ram:ID>
        </ram:TaxRegistration>` : '';

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

  // SEPA Payment Means — only if IBAN available
  const sepaPaymentMeansXML = seller.bankIban ? `
      <!-- SEPA Payment Means -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
        <ram:Description>Zahlbar innerhalb von ${paymentDueDays} Tagen nach Rechnungsdatum</ram:Description>
      </ram:SpecifiedTradePaymentTerms>
      <ram:CreditorFinancialAccount>
        <ram:IBANID>${escapeXML(seller.bankIban)}</ram:IBANID>
        ${seller.bankName ? `<ram:BankName>${escapeXML(seller.bankName)}</ram:BankName>` : ''}
      </ram:CreditorFinancialAccount>
      ${seller.bankBic ? `<ram:CreditorFinancialInstitution><ram:BICID>${escapeXML(seller.bankBic)}</ram:BICID></ram:CreditorFinancialInstitution>` : ''}` : `
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateYYYYMMDD(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
        <ram:Description>Zahlbar innerhalb von ${paymentDueDays} Tagen nach Rechnungsdatum</ram:Description>
      </ram:SpecifiedTradePaymentTerms>`;

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
        <ram:Name>${escapeXML(seller.name)}</ram:Name>
        ${sellerAddressXML}
        ${sellerVatXML}
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

      ${sepaPaymentMeansXML}

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;
}