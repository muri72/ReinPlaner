-- Shift Overrides Table
CREATE TABLE IF NOT EXISTS shift_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('swap', 'absence', 'additional', 'modified')),
  original_employee_id UUID,
  new_employee_id UUID,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL
);

-- RLS
ALTER TABLE shift_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_overrides_tenant_isolation" ON shift_overrides;
CREATE POLICY "shift_overrides_tenant_isolation" ON shift_overrides
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shift_overrides_assignment_date ON shift_overrides(assignment_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_date ON shift_overrides(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_tenant ON shift_overrides(tenant_id);

SELECT 'shift_overrides created' AS status;
