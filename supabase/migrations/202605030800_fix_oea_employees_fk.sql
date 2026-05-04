-- =============================================================================
-- FIX: Add PK to employees and FK order_employee_assignments -> employees
-- =============================================================================

-- Add PRIMARY KEY to employees if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_pkey' AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add FOREIGN KEY order_employee_assignments -> employees if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_employee_assignments_employee_id_fkey' AND table_name = 'order_employee_assignments'
  ) THEN
    ALTER TABLE order_employee_assignments ADD CONSTRAINT order_employee_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id);
  END IF;
END $$;
