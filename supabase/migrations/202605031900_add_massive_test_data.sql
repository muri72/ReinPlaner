-- =============================================================================
-- ADD MORE MASSIVE TEST DATA - 10+ orders per customer, 3-4 objects each
-- Real Hamburg addresses
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '6813721f-afd0-4bba-96d1-e949f9708469';
  v_admin_id UUID := '29c7247c-fc79-4aa8-b1da-801a3854af1e';
  v_manager_id UUID := '800c77fa-bb64-4bf9-8bcd-f6f4bf095a44';
  v_employee_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_object_id UUID;
  i INT;
  j INT;
  
  cust_handelskammer UUID := '7c0278d5-abc3-4f49-af5a-f21cf98ecfdd';
  cust_boemhler UUID := '9c978138-203b-4160-be04-9f1197903295';
  cust_elphi UUID := 'f25e03d5-935d-49e8-b43f-13df96081966';
  cust_atlantic UUID := '7818a497-645b-4838-a4c9-03a0ceac65b4';
  cust_edeka UUID := '49419313-dbd3-49fb-88e7-eacbcd28fe82';
  
  service_types TEXT[] := ARRAY['Büroreinigung', 'Gastronomiereinigung', 'Glasreinigung', 'Praxisreinigung', 'Treppenhausreinigung', 'Unterhaltsreinigung', 'Eventreinigung', 'Bauendreinigung'];
  service_keys TEXT[] := ARRAY['buero-reinigung', 'gastronomie-reinigung', 'glasreinigung', 'praxisreinigung', 'treppenhaus', 'unterhaltsreinigung', 'eventreinigung', 'baureinigung'];
  statuses TEXT[] := ARRAY['active', 'scheduled', 'paused', 'completed'];
  order_types TEXT[] := ARRAY['recurring', 'one-time', 'one_time'];
  priorities TEXT[] := ARRAY['low', 'medium', 'high', 'urgent'];
BEGIN
  RAISE NOTICE 'Starting to add massive test data...';

  -- Objects don't have tenant_id, only customer_id
  INSERT INTO objects (customer_id, name, address, description, access_method, notes)
  VALUES 
    (cust_handelskammer, 'Handelskammer Hamburg - Bildungszentrum', 'Alstertor 22, 20095 Hamburg', 'Bildungszentrum mit 15 Schulungsräumen, 2500m² Gesamtfläche', 'Schlüssel hinterlegt bei Empfang', 'Zugang über Seiteneingang nach 18:00 Uhr möglich'),
    (cust_handelskammer, 'Handelskammer Hamburg - Konferenzzentrum', 'Klostergang 18, 20257 Hamburg', 'Modernes Konferenzzentrum mit 8 Veranstaltungsräumen', 'Code: 4821', 'Parkgarage vorhanden'),
    (cust_boemhler, 'Böhmler GmbH - Produktionshalle', 'Moorburger Bogen 4, 21079 Hamburg', 'Produktionshalle mit 3000m²', 'Schlüsselbund im Schaltkasten links vom Tor 3', 'Anlieferung täglich 06:00-18:00'),
    (cust_boemhler, 'Böhmler GmbH - Verwaltung', 'Rosenbrook 28, 21079 Hamburg', 'Verwaltungsgebäude mit 1200m² Bürofläche', 'Transponderkarte', 'Rezeption 24/7 besetzt'),
    (cust_elphi, 'Elbphilharmonie - Großer Saal', 'Platz der Deutschen Einheit 1, 20459 Hamburg', 'Großer Saal mit 2100 Plätzen', 'VIP-Schlüssel mit Alarmknopf', 'Koordination mit Veranstaltungsteams erforderlich'),
    (cust_elphi, 'Elbphilharmonie - Foyer and Restaurants', 'Platz der Deutschen Einheit 2, 20459 Hamburg', 'Foyerbereich 3500m², zwei Restaurants', 'Transponder-System', 'Reinigung vor 10:00 und nach 23:00'),
    (cust_atlantic, 'Hotel Atlantic - Wellnessbereich', 'An der Alster 82, 20099 Hamburg', 'Spa-Bereich mit Pool, Saunen', 'Persönlicher Schlüssel', 'Nur für Hotelgäste und Personal'),
    (cust_atlantic, 'Hotel Atlantic - Bankettsäle', 'An der Alster 84, 20099 Hamburg', 'Drei Bankettsäle für bis 500 Personen', 'Zentralschlüssel', 'Reinigung nach jeder Veranstaltung'),
    (cust_edeka, 'EDEKA Center - Kühlhäuser', 'Lämmersieth 62, 22305 Hamburg', 'Drei Kühlhäuser mit -20°C, -5°C und +5°C', 'Spezialschlüssel K1-K3', 'Kühlkleidung muss getragen werden'),
    (cust_edeka, 'EDEKA Center - Backshop and Bistro', 'Lämmersieth 64, 22305 Hamburg', 'Integrierter Backshop mit 200m²', 'Transponder', 'Reinigung täglich nach 21:00');

  RAISE NOTICE 'Added 10 new objects (2 per customer)';

  FOR v_customer_id IN SELECT id FROM customers WHERE tenant_id = v_tenant_id LOOP
    FOR v_object_id IN SELECT id FROM objects WHERE customer_id = v_customer_id LOOP
      FOR i IN 1..3 LOOP
        j := (random() * 7)::INT + 1;
        INSERT INTO orders (
          tenant_id, customer_id, object_id, user_id, title, status, order_type,
          service_type, service_key, start_date, end_date, fixed_monthly_price,
          total_estimated_hours, priority, notes, description
        )
        VALUES (
          v_tenant_id, v_customer_id, v_object_id, v_admin_id,
          service_types[j] || ' - ' || (SELECT name FROM objects WHERE id = v_object_id),
          statuses[(random() * 3)::INT + 1],
          order_types[(random() * 2)::INT + 1],
          service_types[j], service_keys[j],
          CURRENT_DATE - (random() * 180)::INT,
          CURRENT_DATE + (random() * 365)::INT,
          (random() * 900 + 100)::NUMERIC(10,2),
          (random() * 40 + 5)::NUMERIC(10,1),
          priorities[(random() * 3)::INT + 1],
          'Automatisch generierter Testauftrag ' || i || ' für Objekt ' || v_object_id,
          'Dieser Auftrag wurde für Testzwecke erstellt'
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Added multiple orders per object';

  INSERT INTO orders (tenant_id, customer_id, object_id, user_id, title, status, order_type, service_type, service_key, start_date, end_date, fixed_monthly_price, total_estimated_hours, priority, notes, description)
  VALUES
    (v_tenant_id, cust_handelskammer, (SELECT id FROM objects WHERE customer_id = cust_handelskammer AND name LIKE '%Hauptgebäude%' LIMIT 1), v_admin_id, 'Tägliche Unterhaltsreinigung Hauptgebäude', 'active', 'recurring', 'Unterhaltsreinigung', 'unterhaltsreinigung', '2024-01-01', '2025-12-31', 2500.00, 120.0, 'high', 'laufende Reinigung', 'Tägliche Reinigung aller Büroräume'),
    (v_tenant_id, cust_handelskammer, (SELECT id FROM objects WHERE customer_id = cust_handelskammer AND name LIKE '%Hauptgebäude%' LIMIT 1), v_admin_id, 'Fensterreinigung Hauptgebäude', 'scheduled', 'one-time', 'Glasreinigung', 'glasreinigung', '2024-06-01', '2024-06-30', 850.00, 25.0, 'medium', 'geplant für Juni', 'Große Fensterflächen im Atrium'),
    (v_tenant_id, cust_handelskammer, (SELECT id FROM objects WHERE customer_id = cust_handelskammer AND name LIKE '%Bildungszentrum%' LIMIT 1), v_manager_id, 'Reinigung Bildungszentrum Abendkurse', 'active', 'recurring', 'Büroreinigung', 'buero-reinigung', '2024-03-01', '2025-02-28', 1800.00, 80.0, 'medium', 'montags bis freitags nach 20 Uhr', 'Reinigung nach Abendkursen'),
    (v_tenant_id, cust_handelskammer, (SELECT id FROM objects WHERE customer_id = cust_handelskammer AND name LIKE '%Bildungszentrum%' LIMIT 1), v_admin_id, 'Grundreinigung Schulungsräume', 'completed', 'one_time', 'Bauendreinigung', 'baureinigung', '2024-02-15', '2024-02-20', 1200.00, 35.0, 'urgent', 'abgeschlossen', 'Intensive Grundreinigung nach Renovierung'),
    (v_tenant_id, cust_handelskammer, (SELECT id FROM objects WHERE customer_id = cust_handelskammer AND name LIKE '%Konferenzzentrum%' LIMIT 1), v_admin_id, 'Eventreinigung Konferenzzentrum', 'paused', 'event', 'Eventreinigung', 'eventreinigung', '2024-04-01', '2024-09-30', 0.00, 0.0, 'high', 'pausiert wegen Renovierung', 'Reinigung nach jeder Veranstaltung'),
    (v_tenant_id, cust_boemhler, (SELECT id FROM objects WHERE customer_id = cust_boemhler AND name LIKE '%Produktionshalle%' LIMIT 1), v_admin_id, 'Produktionshallen-Reinigung', 'active', 'recurring', 'Unterhaltsreinigung', 'unterhaltsreinigung', '2024-01-15', '2025-01-14', 3200.00, 150.0, 'high', 'Schichtarbeit 3-22 Uhr', 'Tägliche Reinigung der Produktionsflächen'),
    (v_tenant_id, cust_boemhler, (SELECT id FROM objects WHERE customer_id = cust_boemhler AND name LIKE '%Produktionshalle%' LIMIT 1), v_manager_id, 'Sanitärreinigung Sozialräume', 'active', 'recurring', 'Praxisreinigung', 'praxisreinigung', '2024-02-01', '2025-01-31', 950.00, 45.0, 'medium', 'halbmonatlich', 'Gründliche Sanitärreinigung'),
    (v_tenant_id, cust_boemhler, (SELECT id FROM objects WHERE customer_id = cust_boemhler AND name LIKE '%Verwaltung%' LIMIT 1), v_admin_id, 'Büroreinigung Verwaltung', 'active', 'recurring', 'Büroreinigung', 'buero-reinigung', '2024-01-01', '2025-12-31', 1100.00, 55.0, 'medium', 'Nachtarbeit', 'Abendliche Büroreinigung'),
    (v_tenant_id, cust_boemhler, (SELECT id FROM objects WHERE customer_id = cust_boemhler AND name LIKE '%Verwaltung%' LIMIT 1), v_manager_id, 'Teppichreinigung', 'scheduled', 'one_time', 'Grundreinigung', 'grundreinigung', '2024-07-01', '2024-07-15', 600.00, 20.0, 'low', 'geplant Juli', 'Professionelle Teppichreinigung'),
    (v_tenant_id, cust_boemhler, (SELECT id FROM objects WHERE customer_id = cust_boemhler AND name LIKE '%Produktionshalle%' LIMIT 1), v_admin_id, 'Fensterreinigung Produktion', 'completed', 'one-time', 'Glasreinigung', 'glasreinigung', '2024-03-01', '2024-03-10', 450.00, 12.0, 'low', 'abgeschlossen', 'Außenfenster Produktionshalle'),
    (v_tenant_id, cust_elphi, (SELECT id FROM objects WHERE customer_id = cust_elphi AND name LIKE '%Großer Saal%' LIMIT 1), v_admin_id, 'Veranstaltungsreinigung Großer Saal', 'active', 'event', 'Eventreinigung', 'eventreinigung', '2024-01-01', '2025-12-31', 0.00, 0.0, 'urgent', 'nach jeder Veranstaltung', 'Reinigung nach Konzerten und Events'),
    (v_tenant_id, cust_elphi, (SELECT id FROM objects WHERE customer_id = cust_elphi AND name LIKE '%Großer Saal%' LIMIT 1), v_manager_id, 'Tägliche Unterhaltsreinigung', 'active', 'recurring', 'Unterhaltsreinigung', 'unterhaltsreinigung', '2024-01-01', '2025-12-31', 4500.00, 200.0, 'high', 'täglich 06:00-10:00', 'Grundreinigung vor Betriebsbeginn'),
    (v_tenant_id, cust_elphi, (SELECT id FROM objects WHERE customer_id = cust_elphi AND name LIKE '%Foyer%' LIMIT 1), v_admin_id, 'Foyerreinigung', 'active', 'recurring', 'Gastronomiereinigung', 'gastronomie-reinigung', '2024-01-01', '2025-12-31', 2200.00, 100.0, 'medium', 'morgens und abends', 'Reinigung des Foyerbereichs'),
    (v_tenant_id, cust_elphi, (SELECT id FROM objects WHERE customer_id = cust_elphi AND name LIKE '%Foyer%' LIMIT 1), v_manager_id, 'Glasreinigung Foyer', 'scheduled', 'one-time', 'Glasreinigung', 'glasreinigung', '2024-06-15', '2024-06-30', 1800.00, 40.0, 'medium', 'Sommerputz', 'Große Glasfronten'),
    (v_tenant_id, cust_elphi, (SELECT id FROM objects WHERE customer_id = cust_elphi AND name LIKE '%Großer Saal%' LIMIT 1), v_admin_id, 'Sonderreinigung nach Großevent', 'completed', 'event', 'Eventreinigung', 'eventreinigung', '2024-04-20', '2024-04-22', 3500.00, 80.0, 'urgent', 'abgeschlossen', 'Reinigung nach Philharmonic Gala'),
    (v_tenant_id, cust_atlantic, (SELECT id FROM objects WHERE customer_id = cust_atlantic AND name LIKE '%Wellnessbereich%' LIMIT 1), v_admin_id, 'Wellnessbereich-Reinigung', 'active', 'recurring', 'Praxisreinigung', 'praxisreinigung', '2024-01-01', '2025-12-31', 2800.00, 130.0, 'high', 'täglich 05:00-09:00 und 20:00-23:00', 'Pool, Saunen und Behandlungsräume'),
    (v_tenant_id, cust_atlantic, (SELECT id FROM objects WHERE customer_id = cust_atlantic AND name LIKE '%Wellnessbereich%' LIMIT 1), v_manager_id, 'Whirlpool-Sonderreinigung', 'scheduled', 'one_time', 'Grundreinigung', 'grundreinigung', '2024-07-01', '2024-07-07', 650.00, 18.0, 'medium', 'geplant Juli', 'Intensive Whirlpool-Reinigung'),
    (v_tenant_id, cust_atlantic, (SELECT id FROM objects WHERE customer_id = cust_atlantic AND name LIKE '%Bankettsäle%' LIMIT 1), v_admin_id, 'Bankett-Reinigung', 'active', 'event', 'Eventreinigung', 'eventreinigung', '2024-01-01', '2025-12-31', 0.00, 0.0, 'urgent', 'nach jeder Veranstaltung', 'Reinigung der Bankettsäle'),
    (v_tenant_id, cust_atlantic, (SELECT id FROM objects WHERE customer_id = cust_atlantic AND name LIKE '%Bankettsäle%' LIMIT 1), v_manager_id, 'Teppichpflege Bankettsäle', 'paused', 'one-time', 'Grundreinigung', 'grundreinigung', '2024-05-01', '2024-10-31', 0.00, 0.0, 'low', 'pausiert bis September', 'Professionelle Teppichpflege'),
    (v_tenant_id, cust_atlantic, (SELECT id FROM objects WHERE customer_id = cust_atlantic AND name LIKE '%Wellnessbereich%' LIMIT 1), v_admin_id, 'chlorfreie Poolreinigung', 'completed', 'one_time', 'Praxisreinigung', 'praxisreinigung', '2024-03-15', '2024-03-20', 520.00, 15.0, 'high', 'abgeschlossen', 'Spezialreinigung nach Chlorumstellung'),
    (v_tenant_id, cust_edeka, (SELECT id FROM objects WHERE customer_id = cust_edeka AND name LIKE '%Kühlhäuser%' LIMIT 1), v_admin_id, 'Kühlhaus-Reinigung', 'active', 'recurring', 'Praxisreinigung', 'praxisreinigung', '2024-01-01', '2025-12-31', 1900.00, 85.0, 'high', 'täglich nach Ladenschluss', 'Reinigung aller Kühlbereiche'),
    (v_tenant_id, cust_edeka, (SELECT id FROM objects WHERE customer_id = cust_edeka AND name LIKE '%Kühlhäuser%' LIMIT 1), v_manager_id, 'Kühlhaus-Grundreinigung', 'scheduled', 'one_time', 'Bauendreinigung', 'baureinigung', '2024-08-01', '2024-08-14', 2100.00, 55.0, 'medium', 'geplant August', 'Jährliche Tiefenreinigung'),
    (v_tenant_id, cust_edeka, (SELECT id FROM objects WHERE customer_id = cust_edeka AND name LIKE '%Backshop%' LIMIT 1), v_admin_id, 'Backshop-Reinigung', 'active', 'recurring', 'Gastronomiereinigung', 'gastronomie-reinigung', '2024-01-01', '2025-12-31', 1400.00, 65.0, 'medium', 'täglich 21:00-02:00', 'Reinigung nach Ladenöffnung'),
    (v_tenant_id, cust_edeka, (SELECT id FROM objects WHERE customer_id = cust_edeka AND name LIKE '%Backshop%' LIMIT 1), v_manager_id, 'Fettfilter-Reinigung', 'paused', 'one-time', 'Grundreinigung', 'grundreinigung', '2024-04-01', '2024-09-30', 0.00, 0.0, 'low', 'pausiert', 'Professionelle Abluftreinigung'),
    (v_tenant_id, cust_edeka, (SELECT id FROM objects WHERE customer_id = cust_edeka AND name LIKE '%Backshop%' LIMIT 1), v_admin_id, 'Spezialreinigung Backofen', 'completed', 'one_time', 'Bauendreinigung', 'baureinigung', '2024-02-10', '2024-02-12', 380.00, 10.0, 'medium', 'abgeschlossen', 'Professionelle Backofenreinigung');

  RAISE NOTICE 'Added specific orders for all customers';

  FOR v_order_id IN SELECT id FROM orders WHERE tenant_id = v_tenant_id ORDER BY created_at DESC LIMIT 30 LOOP
    FOR v_employee_id IN SELECT id FROM employees WHERE tenant_id = v_tenant_id ORDER BY random() LIMIT 2 LOOP
      INSERT INTO order_employee_assignments (order_id, employee_id, tenant_id, start_date, status, assigned_recurrence_interval_weeks)
      VALUES (v_order_id, v_employee_id, v_tenant_id, CURRENT_DATE - (random() * 60)::INT, 'active', 1)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Added employee assignments';

  -- Skip setval for UUID tables

  RAISE NOTICE '========== VERIFICATION ==========';
  RAISE NOTICE 'Objects per customer:';
  RAISE NOTICE '  Handelskammer: %', (SELECT COUNT(*) FROM objects WHERE customer_id = cust_handelskammer);
  RAISE NOTICE '  Böhmler GmbH: %', (SELECT COUNT(*) FROM objects WHERE customer_id = cust_boemhler);
  RAISE NOTICE '  Elbphilharmonie: %', (SELECT COUNT(*) FROM objects WHERE customer_id = cust_elphi);
  RAISE NOTICE '  Hotel Atlantic: %', (SELECT COUNT(*) FROM objects WHERE customer_id = cust_atlantic);
  RAISE NOTICE '  EDEKA Center: %', (SELECT COUNT(*) FROM objects WHERE customer_id = cust_edeka);
  RAISE NOTICE 'Orders per customer:';
  RAISE NOTICE '  Handelskammer: %', (SELECT COUNT(*) FROM orders WHERE customer_id = cust_handelskammer);
  RAISE NOTICE '  Böhmler GmbH: %', (SELECT COUNT(*) FROM orders WHERE customer_id = cust_boemhler);
  RAISE NOTICE '  Elbphilharmonie: %', (SELECT COUNT(*) FROM orders WHERE customer_id = cust_elphi);
  RAISE NOTICE '  Hotel Atlantic: %', (SELECT COUNT(*) FROM orders WHERE customer_id = cust_atlantic);
  RAISE NOTICE '  EDEKA Center: %', (SELECT COUNT(*) FROM orders WHERE customer_id = cust_edeka);
  RAISE NOTICE 'Order statuses:';
  RAISE NOTICE '  active: %', (SELECT COUNT(*) FROM orders WHERE status = 'active');
  RAISE NOTICE '  scheduled: %', (SELECT COUNT(*) FROM orders WHERE status = 'scheduled');
  RAISE NOTICE '  paused: %', (SELECT COUNT(*) FROM orders WHERE status = 'paused');
  RAISE NOTICE '  completed: %', (SELECT COUNT(*) FROM orders WHERE status = 'completed');
  RAISE NOTICE '===================================';
END $$;
