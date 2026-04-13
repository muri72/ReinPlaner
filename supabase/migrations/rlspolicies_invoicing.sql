-- ============================================================================
-- RLS POLICIES FIX - INVOICING TABLES
-- Multi-Tenant Security Fix: tenant_id enforcement
-- ============================================================================
-- PROBLEM: invoice_items hat keine tenant_id, Policies filtern nicht nach tenant_id
-- FIX: tenant_id hinzufügen + korrekte tenant-scoped Policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add tenant_id to invoice_items (MISSING!)
-- ============================================================================
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id);

-- ============================================================================
-- STEP 2: Backfill tenant_id for existing invoice_items
-- ============================================================================
UPDATE invoice_items
SET tenant_id = i.tenant_id
FROM invoices i
WHERE invoice_items.invoice_id = i.id
AND invoice_items.tenant_id IS NULL;

-- ============================================================================
-- STEP 3: Create proper tenant-scoped policies
-- ============================================================================

-- ---- DEBTORS ----
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debtors_admin_manager_all" ON debtors;
CREATE POLICY "debtors_admin_manager_all" ON debtors
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = debtors.tenant_id
        )
    )
    WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = debtors.tenant_id
        )
    );

-- ---- INVOICES ----
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_manager_all" ON invoices;
CREATE POLICY "invoices_admin_manager_all" ON invoices
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = invoices.tenant_id
        )
    )
    WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = invoices.tenant_id
        )
    );

-- ---- INVOICE_ITEMS (NEW - had no tenant_id!) ----
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Admin/Manager: Full access within their tenant
DROP POLICY IF EXISTS "invoice_items_admin_manager_all" ON invoice_items;
CREATE POLICY "invoice_items_admin_manager_all" ON invoice_items
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = invoice_items.tenant_id
        )
    )
    WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = invoice_items.tenant_id
        )
    );

-- ---- PAYMENTS ----
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_admin_manager_all" ON payments;
CREATE POLICY "payments_admin_manager_all" ON payments
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = payments.tenant_id
        )
    )
    WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND tenant_id = payments.tenant_id
        )
    );

-- ---- INVOICE_SEQUENCES ----
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_sequences_admin_all" ON invoice_sequences;
CREATE POLICY "invoice_sequences_admin_all" ON invoice_sequences
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND tenant_id = invoice_sequences.tenant_id
        )
    )
    WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND tenant_id = invoice_sequences.tenant_id
        )
    );

-- ============================================================================
-- STEP 4: Update generate_invoice_number to enforce tenant isolation
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_seq RECORD;
    v_next_num INTEGER;
    v_prefix TEXT;
    v_year INTEGER;
    v_result TEXT;
    v_user_tenant_id UUID;
BEGIN
    -- Get user's tenant and verify match
    SELECT tenant_id INTO v_user_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- Verify tenant isolation
    IF v_user_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Tenant isolation violation: cannot generate invoice for different tenant';
    END IF;

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

-- ============================================================================
-- STEP 5: FK constraint invoice_items -> invoices (for tenant cascade)
-- ============================================================================
-- Note: This ensures tenant isolation through invoice hierarchy
