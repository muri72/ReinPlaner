-- Sprint 4: Rechnungswesen - Invoicing Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DEBTORS (Debitoren)
-- ============================================
CREATE TABLE IF NOT EXISTS debtors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_email TEXT,
    billing_name TEXT,
    billing_street TEXT,
    billing_postal_code VARCHAR(10),
    billing_city TEXT,
    billing_country VARCHAR(3) DEFAULT 'DE',
    tax_id VARCHAR(20),
    vat_id VARCHAR(20),
    bank_name TEXT,
    bank_iban TEXT,
    bank_bic TEXT,
    payment_terms_days INTEGER DEFAULT 30,
    credit_limit_cents INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debtors_tenant ON debtors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debtors_customer ON debtors(customer_id);

-- ============================================
-- INVOICES (Rechnungen)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    debtor_id UUID REFERENCES debtors(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Invoice metadata
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    delivery_date_start DATE,
    delivery_date_end DATE,

    -- Amounts (all in cents)
    net_amount_cents INTEGER NOT NULL DEFAULT 0,
    tax_amount_cents INTEGER NOT NULL DEFAULT 0,
    total_amount_cents INTEGER NOT NULL DEFAULT 0,
    paid_amount_cents INTEGER NOT NULL DEFAULT 0,

    -- Tax
    tax_rate DECIMAL(5,2) DEFAULT 19.00,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void')),

    -- Currency
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Reference
    reference_text TEXT,
    order_reference VARCHAR(100),

    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_debtor ON invoices(debtor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================
-- INVOICE ITEMS (Rechnungspositionen)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    line_number INTEGER NOT NULL DEFAULT 1,
    service_date DATE,
    service_description TEXT NOT NULL,
    quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'h',
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    net_amount_cents INTEGER NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 19.00,
    tax_amount_cents INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort ON invoice_items(invoice_id, sort_order);

-- ============================================
-- PAYMENTS (Zahlungseingänge)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_cents INTEGER NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'bank_transfer'
        CHECK (payment_method IN ('bank_transfer', 'cash', 'credit_card', 'direct_debit', 'check', 'other')),
    reference TEXT,
    bank_reference TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- INVOICE SEQUENCE (Rechnungsnummernkreis)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    prefix VARCHAR(10) DEFAULT 'R',
    current_number INTEGER DEFAULT 0,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FUNCTION: Generate next invoice number
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_seq RECORD;
    v_next_num INTEGER;
    v_prefix TEXT;
    v_year INTEGER;
    v_result TEXT;
BEGIN
    SELECT * INTO v_seq FROM invoice_sequences WHERE tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        INSERT INTO invoice_sequences (tenant_id, prefix, current_number, year)
        VALUES (p_tenant_id, 'R', 1, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
        RETURNING current_number + 1, prefix, year INTO v_next_num, v_prefix, v_year;
    ELSE
        -- Reset counter if year changed
        IF v_seq.year != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER THEN
            v_next_num := 1;
            v_prefix := v_seq.prefix;
            v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
        ELSE
            v_next_num := v_seq.current_number + 1;
            v_prefix := v_seq.prefix;
            v_year := v_seq.year;
        END IF;

        UPDATE invoice_sequences
        SET current_number = v_next_num, year = v_year, updated_at = NOW()
        WHERE tenant_id = p_tenant_id;
    END IF;

    -- Format: PREFIX/YEAR/NUMBER (e.g. R/2025/00042)
    v_result := v_prefix || '/' || v_year || '/' || LPAD(v_next_num::TEXT, 5, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Update invoice totals after item changes
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_net_amount INTEGER;
    v_tax_amount INTEGER;
    v_tax_rate DECIMAL(5,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    SELECT COALESCE(SUM(net_amount_cents), 0),
           COALESCE(SUM(tax_amount_cents), 0),
           COALESCE(MAX(tax_rate), 19.00)
    INTO v_net_amount, v_tax_amount, v_tax_rate
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;

    UPDATE invoices
    SET net_amount_cents = v_net_amount,
        tax_amount_cents = v_tax_amount,
        total_amount_cents = v_net_amount + v_tax_amount,
        tax_rate = v_tax_rate,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- ============================================
-- FUNCTION: Mark overdue invoices
-- ============================================
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'sent'
      AND due_date < CURRENT_DATE
      AND paid_amount_cents < total_amount_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES FOR INVOICING TABLES
-- ============================================
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Debtors: Admin/Manager can do everything
DROP POLICY IF EXISTS "debtors_admin_all" ON debtors;
CREATE POLICY "debtors_admin_all" ON debtors
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Invoices: Admin/Manager can do everything
DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;
CREATE POLICY "invoices_admin_all" ON invoices
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Invoice items: Admin/Manager can do everything
DROP POLICY IF EXISTS "invoice_items_admin_all" ON invoice_items;
CREATE POLICY "invoice_items_admin_all" ON invoice_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Payments: Admin/Manager can do everything
DROP POLICY IF EXISTS "payments_admin_all" ON payments;
CREATE POLICY "payments_admin_all" ON payments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Invoice sequences: Admin only
DROP POLICY IF EXISTS "invoice_sequences_admin_all" ON invoice_sequences;
CREATE POLICY "invoice_sequences_admin_all" ON invoice_sequences
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
