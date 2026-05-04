-- =============================================================================
-- FIX: Add missing primary keys and foreign key constraints
-- =============================================================================

-- Add PRIMARY KEY to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_pkey' AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add PRIMARY KEY to order_employee_assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_employee_assignments_pkey' AND table_name = 'order_employee_assignments'
  ) THEN
    ALTER TABLE order_employee_assignments ADD CONSTRAINT order_employee_assignments_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add FOREIGN KEY from order_employee_assignments to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_employee_assignments_order_id_fkey' AND table_name = 'order_employee_assignments'
  ) THEN
    ALTER TABLE order_employee_assignments ADD CONSTRAINT order_employee_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
  END IF;
END $$;
