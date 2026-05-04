-- =============================================================================
-- SEED TEST DATA v3 - ALL inside SECURITY DEFINER function
-- =============================================================================

CREATE OR REPLACE FUNCTION seed_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID := '6813721f-afd0-4bba-96d1-e949f9708469';
  v_employee_id UUID;
  v_order_id UUID;
  v_shift_id UUID;
  v_customer_id UUID;
  v_manager_id UUID;
  v_admin_id UUID;
  v_shift_date DATE;
BEGIN
  -- Ensure manager profile exists
  UPDATE profiles SET role = 'manager', tenant_id = v_tenant_id, updated_at = NOW()
  WHERE id = '800c77fa-bb64-4bf9-8bcd-f6f4bf095a44';
  
  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, role, tenant_id, updated_at)
    VALUES ('800c77fa-bb64-4bf9-8bcd-f6f4bf095a44', 'manager@reinigung-aris.de', 'manager', v_tenant_id, NOW());
  END IF;

  -- Get IDs
  SELECT id INTO v_admin_id FROM profiles WHERE id = '29c7247c-fc79-4aa8-b1da-801a3854af1e';
  SELECT id INTO v_manager_id FROM profiles WHERE id = '800c77fa-bb64-4bf9-8bcd-f6f4bf095a44';
  SELECT id INTO v_employee_id FROM employees 
  WHERE user_id = '239dada0-f033-4867-a5ee-7d91e2d96368' AND tenant_id = v_tenant_id;
  SELECT id INTO v_order_id FROM orders WHERE tenant_id = v_tenant_id LIMIT 1;

  -- Create shifts for Ana Petrova (next 7 days)
  FOR i IN 0..6 LOOP
    v_shift_date := CURRENT_DATE + i;
    
    INSERT INTO shifts (tenant_id, order_id, shift_date, start_time, end_time, status, notes)
    VALUES (v_tenant_id, v_order_id, v_shift_date, TIME '08:00', TIME '16:00', 'scheduled', 'Test shift')
    RETURNING id INTO v_shift_id;
    
    INSERT INTO shift_employees (tenant_id, shift_id, employee_id)
    VALUES (v_tenant_id, v_shift_id, v_employee_id);
    
    -- Time entry for today
    IF i = 0 THEN
      INSERT INTO time_entries (tenant_id, employee_id, shift_id, start_time, end_time, duration_minutes, type, notes)
      VALUES (v_tenant_id, v_employee_id, v_shift_id, CURRENT_DATE + TIME '08:00', CURRENT_DATE + TIME '12:00', 240, 'work', 'Morning shift');
    END IF;
  END LOOP;

  -- Time accounts
  FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LOOP
    IF NOT EXISTS (
      SELECT 1 FROM time_accounts 
      WHERE employee_id = v_employee_id 
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INT 
      AND month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
    ) THEN
      INSERT INTO time_accounts (employee_id, year, month, target_hours, actual_hours, balance_before, balance_after)
      VALUES (v_employee_id, EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, 160.0, 40.0, 0.0, 0.0);
    END IF;
  END LOOP;

  -- Manager-Customer assignments
  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LIMIT 3 LOOP
    IF NOT EXISTS (SELECT 1 FROM manager_customer_assignments WHERE manager_id = v_manager_id AND customer_id = v_customer_id) THEN
      INSERT INTO manager_customer_assignments (manager_id, customer_id)
      VALUES (v_manager_id, v_customer_id);
    END IF;
  END LOOP;

  -- Absence request
  IF NOT EXISTS (
    SELECT 1 FROM absence_requests 
    WHERE employee_id = v_employee_id AND start_date = CURRENT_DATE + 14
  ) THEN
    INSERT INTO absence_requests (user_id, employee_id, type, start_date, end_date, status, notes)
    VALUES (v_admin_id, v_employee_id, 'vacation', CURRENT_DATE + 14, CURRENT_DATE + 18, 'pending', 'Test: Familienurlaub');
  END IF;

  -- Object for first customer
  SELECT id INTO v_customer_id FROM customers WHERE tenant_id = v_tenant_id LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM objects WHERE name = 'Handelskammer Hamburg - Hauptgebäude') THEN
    INSERT INTO objects (customer_id, name, address, description, access_method)
    VALUES (v_customer_id, 'Handelskammer Hamburg - Hauptgebäude', 'Alter Wall 68, 20457 Hamburg', 'Test-Object', 'Schlüssel');
  END IF;

  -- Notifications
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_admin_id AND title = 'Willkommen im ReinPlaner') THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_admin_id, 'Willkommen im ReinPlaner', 'Admin-Konto aktiv. Alle Systeme betriebsbereit.', 'system', false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_manager_id AND title = 'Urlaubsantrag') THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_manager_id, 'Urlaubsantrag', 'Ana Petrova hat einen Urlaubsantrag gestellt.', 'absence_request', false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = '239dada0-f033-4867-a5ee-7d91e2d96368' AND title = 'Dienstplan aktualisiert') THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      ('239dada0-f033-4867-a5ee-7d91e2d96368', 'Dienstplan aktualisiert', 'Neue Schichten veröffentlicht.', 'schedule', false);
  END IF;

  RAISE NOTICE 'Test data seeded successfully';
END;
$$;

-- Execute it
SELECT seed_test_data();
