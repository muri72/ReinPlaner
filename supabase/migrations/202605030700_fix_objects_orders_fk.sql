-- =============================================================================
-- FIX: Add PRIMARY KEY to objects and FOREIGN KEY orders -> objects
-- =============================================================================

-- Add PRIMARY KEY to objects if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'objects_pkey' AND table_name = 'objects'
  ) THEN
    ALTER TABLE objects ADD CONSTRAINT objects_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Set invalid object_ids to NULL in orders
UPDATE orders SET object_id = NULL 
WHERE object_id IS NOT NULL AND object_id NOT IN (SELECT id FROM objects);

-- Add FOREIGN KEY orders -> objects if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_object_id_fkey' AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_object_id_fkey FOREIGN KEY (object_id) REFERENCES objects(id);
  END IF;
END $$;
