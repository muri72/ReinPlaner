-- =============================================================================
-- MASSIVE SEED TEST DATA v7 - Simplified & Correct Schema
-- =============================================================================

CREATE OR REPLACE FUNCTION seed_massive_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_tenant_id UUID := '6813721f-afd0-4bba-96d1-e949f9708469';
  v_admin_id UUID := '29c7247c-fc79-4aa8-b1da-801a3854af1e';
  v_manager_id UUID := '800c77fa-bb64-4bf9-8bcd-f6f4bf095a44';
  v_employee_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_object_id UUID;
  v_shift_id UUID;
  v_service_id UUID;
  v_date DATE;
  i INT;
  j INT;
BEGIN
  RAISE NOTICE 'Starting massive seed v7...';

  -- =============================================================================
  -- EMPLOYEES - ensure profiles exist
  -- =============================================================================
  FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LOOP
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_employee_id) THEN
      INSERT INTO profiles (id, email, role, tenant_id, updated_at)
      SELECT v_employee_id, LOWER(REPLACE(first_name, ' ', '')) || '@reinigung-aris.de', 'employee', v_tenant_id, NOW()
      FROM employees WHERE id = v_employee_id;
    END IF;
  END LOOP;

  -- =============================================================================
  -- CUSTOMER CONTACTS (3 per customer)
  -- =============================================================================
  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LOOP
    FOR j IN 1..3 LOOP
      INSERT INTO customer_contacts (customer_id, first_name, last_name, email, phone, role)
      VALUES (
        v_customer_id,
        CASE j WHEN 1 THEN 'Max' WHEN 2 THEN 'Anna' WHEN 3 THEN 'Hans' END,
        CASE j WHEN 1 THEN 'Mustermann' WHEN 2 THEN 'Schmidt' WHEN 3 THEN 'Weber' END,
        'kontakt' || j || '_' || SUBSTRING(v_customer_id::TEXT, 1, 8) || '@example.com',
        '+49 40 ' || (1000 + (j * 100)) || ' ' || (100 + j) || '-' || (10 + j),
        CASE j WHEN 1 THEN 'manager' WHEN 2 THEN 'assistant' WHEN 3 THEN 'technician' END
      );
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- SERVICES
  -- =============================================================================
  INSERT INTO services (key, title, short_description, description, base_price, default_hourly_rate, is_active, color) VALUES
    ('buero-reinigung', 'Büroreinigung', 'Tägliche Unterhaltsreinigung', 'Regelmäßige Büroreinigung inkl. Müllentsorgung', 150.00, 35.00, true, '#4CAF50'),
    ('boden-pflege', 'Bodenpflege', 'Reinigung und Pflege aller Böden', 'Professionelle Bodenreinigung und -pflege', 200.00, 40.00, true, '#8BC34A'),
    ('sanitaerreinigung', 'Sanitärreinigung', 'Gründliche Sanitärreinigung', 'Komplette Reinigung aller Sanitäranlagen', 120.00, 35.00, true, '#009688'),
    ('fensterreinigung', 'Fensterreinigung', 'Innen- und Außenfenster', 'Professionelle Glas- und Fensterreinigung', 180.00, 45.00, true, '#00BCD4'),
    ('kuechenreinigung', 'Küchenreinigung', 'Großküchen und Kantinen', 'Spezialreinigung für Großküchen', 220.00, 40.00, true, '#FF9800'),
    ('treppenhaus', 'Treppenhausreinigung', 'Hausmeisterei', 'Regelmäßige Treppenhausreinigung', 100.00, 30.00, true, '#795548'),
    ('grundreinigung', 'Grundreinigung', 'Intensive Komplettreinigung', 'Jährliche Grundreinigung aller Flächen', 500.00, 50.00, true, '#9C27B0'),
    ('baureinigung', 'Bauendreinigung', 'Nach Bauarbeiten', 'Professionelle Bauendreinigung', 800.00, 55.00, true, '#607D8B');

  -- =============================================================================
  -- SERVICE FEATURES
  -- =============================================================================
  FOR v_service_id IN SELECT id FROM services LOOP
    INSERT INTO service_features (service_id, title, description, display_order) VALUES
      (v_service_id, 'Grundreinigung', 'Basisreinigung inklusive', 1),
      (v_service_id, 'Fensterreinigung', 'Innenfensterreinigung', 2),
      (v_service_id, 'Sonderreinigung', 'Zusätzliche Sonderreinigung', 3);
  END LOOP;

  -- =============================================================================
  -- SERVICE RATES (reference table)
  -- =============================================================================
  INSERT INTO service_rates (service_type, hourly_rate) VALUES
    ('weekday', 35.00),
    ('weekend', 45.00),
    ('holiday', 55.00);

  -- =============================================================================
  -- OBJECTS (2 per customer)
  -- =============================================================================
  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LOOP
    FOR j IN 1..2 LOOP
      INSERT INTO objects (customer_id, name, address, description, access_method, notes)
      VALUES (
        v_customer_id,
        (SELECT name FROM customers WHERE id = v_customer_id) || ' - Standort ' || j,
        'Musterstraße ' || (10 + j * 5) || ', 20' || (400 + j) || ' Hamburg',
        'Objekt ' || j || ' mit ' || (1000 + j * 500) || ' m² Reinigungsfläche',
        CASE WHEN j = 1 THEN 'Schlüssel' ELSE 'Code: ' || (1000 + j) END,
        'Zugang über Haupteingang'
      );
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- ORDERS (5 per customer)
  -- =============================================================================
  i := 0;
  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LOOP
    SELECT id INTO v_object_id FROM objects WHERE customer_id = v_customer_id LIMIT 1;
    
    FOR v_service_id IN SELECT id FROM services LIMIT 5 LOOP
      i := i + 1;
      INSERT INTO orders (
        tenant_id, customer_id, object_id, user_id, title,
        status, order_type, service_type, service_key,
        start_date, end_date, fixed_monthly_price,
        total_estimated_hours, notes
      )
      VALUES (
        v_tenant_id, v_customer_id, v_object_id, v_admin_id,
        (SELECT title FROM services WHERE id = v_service_id),
        CASE WHEN i % 3 = 0 THEN 'scheduled' ELSE 'active' END,
        'recurring',
        'cleaning',
        (SELECT key FROM services WHERE id = v_service_id),
        CURRENT_DATE - (((30 + (i * 5)) || ' days')::INTERVAL),
        CURRENT_DATE + INTERVAL '365 days',
        CASE WHEN (SELECT key FROM services WHERE id = v_service_id) = 'grundreinigung' THEN 500.00 ELSE (1000.00 + (i * 100)) END,
        CASE WHEN (SELECT key FROM services WHERE id = v_service_id) = 'grundreinigung' THEN 2 ELSE (20 + (i * 5)) END,
        'Auftrag erstellt aus Testdatensaat'
      );
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- ORDER EMPLOYEE ASSIGNMENTS
  -- =============================================================================
  FOR v_order_id IN SELECT id FROM orders WHERE tenant_id = v_tenant_id LIMIT 10 LOOP
    FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LIMIT 2 LOOP
      INSERT INTO order_employee_assignments (order_id, employee_id, tenant_id, start_date, status, assigned_recurrence_interval_weeks)
      VALUES (v_order_id, v_employee_id, v_tenant_id, CURRENT_DATE, 'active', 1);
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- SHIFTS (4 weeks for all employees)
  -- =============================================================================
  FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LOOP
    SELECT id INTO v_order_id FROM orders WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT customer_id, id INTO v_customer_id, v_object_id FROM objects WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = v_tenant_id) LIMIT 1;
    
    FOR i IN 0..27 LOOP
      v_date := CURRENT_DATE + i;
      IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN
        INSERT INTO shifts (
          tenant_id, order_id, shift_date, start_time, end_time,
          status, notes, estimated_hours, break_time_minutes, travel_time_minutes
        )
        VALUES (
          v_tenant_id, v_order_id, v_date, TIME '07:30', TIME '16:00',
          CASE WHEN i < 0 THEN 'completed' ELSE 'scheduled' END,
          'Reguläre Schicht',
          8.0, 30, CASE WHEN i % 3 = 0 THEN 30 ELSE 0 END
        )
        RETURNING id INTO v_shift_id;
        
        INSERT INTO shift_employees (shift_id, employee_id, role, is_confirmed)
        VALUES (v_shift_id, v_employee_id, 'cleaner', true);
        
        -- Time entries for past shifts
        IF i < 7 AND i > 0 THEN
          INSERT INTO time_entries (
            tenant_id, employee_id, shift_id, customer_id, object_id,
            start_time, end_time, duration_minutes, type, notes
          )
          VALUES (
            v_tenant_id, v_employee_id, v_shift_id, v_customer_id, v_object_id,
            v_date + TIME '07:30', v_date + TIME '11:30',
            240, 'work', 'Morning'
          );
          
          INSERT INTO time_entries (
            tenant_id, employee_id, shift_id, customer_id, object_id,
            start_time, end_time, duration_minutes, type, notes
          )
          VALUES (
            v_tenant_id, v_employee_id, v_shift_id, v_customer_id, v_object_id,
            v_date + TIME '12:00', v_date + TIME '16:00',
            240, 'work', 'Afternoon'
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- TIME ACCOUNTS (4 months for all employees)
  -- =============================================================================
  FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LOOP
    FOR i IN 0..3 LOOP
      INSERT INTO time_accounts (
        employee_id, year, month, target_hours, actual_hours,
        balance_before, balance_after
      )
      VALUES (
        v_employee_id,
        EXTRACT(YEAR FROM (CURRENT_DATE - ((i || ' months')::INTERVAL)))::INT,
        EXTRACT(MONTH FROM (CURRENT_DATE - ((i || ' months')::INTERVAL)))::INT,
        160.0,
        CASE WHEN i = 0 THEN 40.0 WHEN i = 1 THEN 152.0 WHEN i = 2 THEN 168.0 ELSE 145.0 END,
        CASE WHEN i > 0 THEN (i * 8)::FLOAT ELSE 0.0 END,
        CASE WHEN i > 0 THEN ((i + 1) * 8)::FLOAT ELSE 8.0 END
      );
    END LOOP;
  END LOOP;

  -- =============================================================================
  -- ABSENCE REQUESTS (2 per employee)
  -- =============================================================================
  FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id LOOP
    INSERT INTO absence_requests (user_id, employee_id, type, start_date, end_date, status, notes)
    VALUES (v_employee_id, v_employee_id, 'vacation', CURRENT_DATE + 14, CURRENT_DATE + 21, 'pending', 'Sommerurlaub');
    
    INSERT INTO absence_requests (user_id, employee_id, type, start_date, end_date, status, notes)
    VALUES (v_employee_id, v_employee_id, 'sick', CURRENT_DATE - 3, CURRENT_DATE - 2, 'approved', 'Grippaler Infekt');
  END LOOP;

-- =============================================================================
  -- TICKETS (3 per customer)
  -- =============================================================================
  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LOOP
    INSERT INTO tickets (user_id, customer_id, title, description, priority, status) VALUES
      (v_customer_id, v_customer_id, 'Reinigungsmittel nachbestellen', 'Bitte neue Reinigungsmittel bereitstellen', 'low', 'open'),
      (v_customer_id, v_customer_id, 'Schaden gemeldet', 'Wasserfleck in Büro 2. Stock', 'high', 'in_progress'),
      (v_customer_id, v_customer_id, 'Termin verschieben', 'Termin auf 14:00 verschieben?', 'medium', 'pending');
  END LOOP;

  -- =============================================================================
  -- NOTIFICATIONS
  -- =============================================================================
  INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
    (v_admin_id, 'System startklar', 'ReinPlaner Backend erfolgreich initialisiert.', 'system', false),
    (v_admin_id, 'Urlaubsantrag', 'Ana Petrova hat Urlaubsantrag gestellt.', 'absence_request', false),
    (v_admin_id, 'Monatsbericht', 'Monatsbericht für April 2026 verfügbar.', 'report', true),
    (v_manager_id, 'Dienstplan aktualisiert', 'Neue Schichten veröffentlicht.', 'schedule', false),
    (v_manager_id, 'Urlaubsantrag von Ana', 'Urlaubsantrag zur Genehmigung bereit.', 'absence_request', false),
    (v_manager_id, 'Kundenzufriedenheit', 'Neue Bewertung: 4.5/5', 'feedback', false);

  INSERT INTO notifications (user_id, title, message, type, is_read)
  SELECT e.user_id, 'Dienstplan diese Woche', 'Deine Schichten für diese Woche wurden veröffentlicht.', 'schedule', false
  FROM employees e WHERE e.tenant_id = v_tenant_id AND e.user_id IS NOT NULL;

  RAISE NOTICE 'MASSIVE test data seeded successfully v7!';
END;
$$;

SELECT seed_massive_test_data();
