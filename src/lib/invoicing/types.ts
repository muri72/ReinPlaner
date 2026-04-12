// ============================================
// Invoice Types for ReinPlaner
// ============================================

export interface Debtor {
  id: string;
  tenant_id: string | null;
  customer_id: string | null;
  invoice_email: string | null;
  billing_name: string | null;
  billing_street: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string;
  tax_id: string | null;
  vat_id: string | null;
  bank_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  payment_terms_days: number;
  credit_limit_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string | null;
  invoice_number: string;
  debtor_id: string | null;
  order_id: string | null;

  issue_date: string;
  due_date: string;
  delivery_date_start: string | null;
  delivery_date_end: string | null;

  net_amount_cents: number;
  tax_amount_cents: number;
  total_amount_cents: number;
  paid_amount_cents: number;

  tax_rate: number;
  status: InvoiceStatus;
  currency: string;

  notes: string | null;
  internal_notes: string | null;
  reference_text: string | null;
  order_reference: string | null;

  reminder_count: number;
  last_reminder_at: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  paid_at: string | null;

  // Joined data
  debtor?: Debtor;
  items?: InvoiceItem[];
  order?: {
    id: string;
    title: string;
    customer_id: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string | null;
  };
  payments?: Payment[];
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'void';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  line_number: number;
  service_date: string | null;
  service_description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  net_amount_cents: number;
  tax_rate: number;
  tax_amount_cents: number;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string | null;
  invoice_id: string;
  payment_date: string;
  amount_cents: number;
  payment_method: PaymentMethod;
  reference: string | null;
  bank_reference: string | null;
  created_by: string | null;
  created_at: string;
}

export type PaymentMethod = 'bank_transfer' | 'cash' | 'credit_card' | 'direct_debit' | 'check' | 'other';

export interface InvoiceFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  debtor_id?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CreateInvoiceData {
  debtor_id: string;
  order_id?: string;
  issue_date?: string;
  due_date: string;
  delivery_date_start?: string;
  delivery_date_end?: string;
  tax_rate?: number;
  notes?: string;
  internal_notes?: string;
  reference_text?: string;
  order_reference?: string;
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'line_number' | 'net_amount_cents' | 'tax_amount_cents'>[];
}

export interface UpdateInvoiceData {
  issue_date?: string;
  due_date?: string;
  delivery_date_start?: string;
  delivery_date_end?: string;
  tax_rate?: number;
  notes?: string;
  internal_notes?: string;
  reference_text?: string;
  order_reference?: string;
  status?: InvoiceStatus;
}

export interface DATEVExportOptions {
  date_from: string;
  date_to: string;
  format: 'csv' | 'xml';
}

export interface ZUGFeRDExportOptions {
  invoice_id: string;
  format?: 'xml' | 'pdf';
}
