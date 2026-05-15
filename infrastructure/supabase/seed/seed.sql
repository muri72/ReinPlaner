-- ============================================================
-- ReinPlaner — Seed Data
-- ============================================================
-- Two tenants: ARIS (real) and Tester (dummy)
-- Run: docker exec -i reinplaner_postgres psql -U supabase_admin -d postgres -f /docker-entrypoint-initdb.d/seed.sql
-- ============================================================

-- Supabase internal schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- ============================================================
-- TENANT 1: ARIS (Primary)
-- ============================================================

-- Tenants table
INSERT INTO public.tenants (id, name, slug, plan, status, settings, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'ARIS Reinigungsfirma Hamburg',
    'aris',
    'pro',
    'active',
    '{"timezone": "Europe/Berlin", "currency": "EUR", "locale": "de-DE"}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ARIS Users
INSERT INTO public.users (id, tenant_id, email, display_name, first_name, last_name, password_hash, role, status, metadata, created_at, updated_at)
VALUES
    -- Admin
    ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@aris-reinigung.de', 'Murat K', 'Murat', 'Kara', 'dummy_hash_admin', 'admin', 'active', '{"phone": "+491234567890"}'::jsonb, NOW(), NOW()),
    -- Manager
    ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'manager@aris-reinigung.de', 'Thomas B', 'Thomas', 'Bauer', 'dummy_hash_manager', 'manager', 'active', '{"phone": "+491234567891"}'::jsonb, NOW(), NOW()),
    -- Employee (Reinigungskraft)
    ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'employee1@aris-reinigung.de', 'Elif Y', 'Elif', 'Yilmaz', 'dummy_hash_employee', 'employee', 'active', '{"phone": "+491234567892"}'::jsonb, NOW(), NOW()),
    -- Employee
    ('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'employee2@aris-reinigung.de', 'Hans M', 'Hans', 'Mueller', 'dummy_hash_employee', 'employee', 'active', '{"phone": "+491234567893"}'::jsonb, NOW(), NOW()),
    -- Customer
    ('55555555-5555-5555-5555-555555555555', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'customer1@firma.de', 'Klaus Richter', 'Klaus', 'Richter', 'dummy_hash_customer', 'customer', 'active', '{"company": "Firma GmbH"}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ARIS Customers
INSERT INTO public.customers (id, tenant_id, name, email, phone, address, city, status, created_at, updated_at)
VALUES
    ('c0000001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Firma GmbH', 'k.richter@firma.de', '+493012345678', 'Industriestraße 42', 'Hamburg', 'active', NOW(), NOW()),
    ('c0000002-0002-0002-0002-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Büro Center HH', 'info@buero-center.de', '+493045678901', 'Speicherstadt 15', 'Hamburg', 'active', NOW(), NOW()),
    ('c0000003-0003-0003-0003-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hotel Elbphilharmonie', 'buchhaltung@hotel-elb.de', '+493098765432', 'Platz der Deutschen Einheit 1', 'Hamburg', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ARIS Services
INSERT INTO public.services (id, tenant_id, name, description, duration_minutes, price_cents, unit, status, created_at, updated_at)
VALUES
    ('s0000001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Büroreinigung', 'Regelmäßige Büroflächenreinigung inkl. Böden, Fenster, Sanitärbereich', 120, 4500, 'pro_stunde', 'active', NOW(), NOW()),
    ('s0000002-0002-0002-0002-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Grundreinigung', 'Intensive Tiefenreinigung für Böden, Teppiche und Oberflächen', 240, 8900, 'pro_einsatz', 'active', NOW(), NOW()),
    ('s0000003-0003-0003-0003-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fensterreinigung', 'Innen- und Außenfenster inkl. Rahmen und Klinken', 90, 3500, 'pro_einsatz', 'active', NOW(), NOW()),
    ('s0000004-0004-0004-0004-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Baureinigung', 'Reinigung nach Bauarbeiten, Bauschutt entfernen', 180, 12000, 'pro_einsatz', 'active', NOW(), NOW()),
    ('s0000005-0005-0005-0005-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Unterhaltsreinigung', 'Tägliche Unterhaltsreinigung für stark frequentierte Bereiche', 60, 2800, 'pro_stunde', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ARIS Shifts
INSERT INTO public.shifts (id, tenant_id, employee_id, customer_id, service_id, date, start_time, end_time, break_minutes, status, notes, created_at, updated_at)
VALUES
    -- Today
    ('sh000001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 'c0000001-0001-0001-0001-000000000001', 's0000001-0001-0001-0001-000000000001', CURRENT_DATE, '08:00', '12:00', 30, 'scheduled', 'Büro Etage 2 + 3', NOW(), NOW()),
    ('sh000002-0002-0002-0002-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 'c0000002-0002-0002-0002-000000000002', 's0000001-0001-0001-0001-000000000001', CURRENT_DATE, '09:00', '13:00', 30, 'scheduled', 'Eingangsbereich + Empfang', NOW(), NOW()),
    -- Tomorrow
    ('sh000003-0003-0003-0003-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 'c0000003-0003-0003-0003-000000000003', 's0000002-0002-0002-0002-000000000002', CURRENT_DATE + INTERVAL '1 day', '07:00', '11:00', 30, 'scheduled', 'Hotelzimmer 101-110', NOW(), NOW()),
    -- This week
    ('sh000004-0004-0004-0004-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 'c0000001-0001-0001-0001-000000000001', 's0000003-0003-0003-0003-000000000003', CURRENT_DATE + INTERVAL '2 day', '14:00', '17:30', 0, 'scheduled', 'Alle Fenster EG', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ARIS Invoices
INSERT INTO public.invoices (id, tenant_id, customer_id, invoice_number, year, amount_cents, status, period_start, period_end, due_date, paid_at, created_at, updated_at)
VALUES
    ('inv00001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c0000001-0001-0001-0001-000000000001', 'RE-2025-001', 2025, 89000, 'paid', '2025-03-01', '2025-03-31', '2025-04-15', '2025-04-10 10:30:00', NOW(), NOW()),
    ('inv00002-0002-0002-0002-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c0000002-0002-0002-0002-000000000002', 'RE-2025-002', 2025, 45000, 'sent', '2025-04-01', '2025-04-30', '2025-05-15', NULL, NOW(), NOW()),
    ('inv00003-0003-0003-0003-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c0000003-0003-0003-0003-000000000003', 'RE-2025-003', 2025, 125000, 'paid', '2025-04-01', '2025-04-30', '2025-05-15', '2025-05-08 14:20:00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TENANT 2: Tester (Dummy)
-- ============================================================

INSERT INTO public.tenants (id, name, slug, plan, status, settings, created_at, updated_at)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'Test Firma',
    'tester',
    'trial',
    'active',
    '{"timezone": "Europe/Berlin", "currency": "EUR", "locale": "de-DE"}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Tester Users
INSERT INTO public.users (id, tenant_id, email, display_name, first_name, last_name, password_hash, role, status, metadata, created_at, updated_at)
VALUES
    ('t1111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'test-admin@test.de', 'Test Admin', 'Test', 'Admin', 'dummy_hash', 'admin', 'active', '{}'::jsonb, NOW(), NOW()),
    ('t2222222-2222-2222-2222-222222222222', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'test-employee@test.de', 'Test Employee', 'Test', 'Mitarbeiter', 'dummy_hash', 'employee', 'active', '{}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Tester Customers
INSERT INTO public.customers (id, tenant_id, name, email, phone, address, city, status, created_at, updated_at)
VALUES
    ('tc000001-0001-0001-0001-000000000001', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Test Kund GmbH', 'test@test-kund.de', '+493012345679', 'Teststraße 1', 'Berlin', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Tester Services
INSERT INTO public.services (id, tenant_id, name, description, duration_minutes, price_cents, unit, status, created_at, updated_at)
VALUES
    ('ts000001-0001-0001-0001-000000000001', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Test Service 1', 'Dummy service for testing', 60, 1000, 'pro_stunde', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Auth (Supabase internal tables)
-- ============================================================

-- Create auth.users metadata table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    instance_id UUID,
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    confirmation_token TEXT,
    recovery_token TEXT,
    reset_token_valid_until TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    raw_user_meta_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    authentication_method TEXT DEFAULT 'password'
);

-- Insert auth records
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@aris-reinigung.de', '$2a$10$dummy_hash_admin', NOW(), '{"display_name": "Murat K", "first_name": "Murat", "last_name": "Kara"}'::jsonb, NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'manager@aris-reinigung.de', '$2a$10$dummy_hash_manager', NOW(), '{"display_name": "Thomas B", "first_name": "Thomas", "last_name": "Bauer"}'::jsonb, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'employee1@aris-reinigung.de', '$2a$10$dummy_hash_employee', NOW(), '{"display_name": "Elif Y", "first_name": "Elif", "last_name": "Yilmaz"}'::jsonb, NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'employee2@aris-reinigung.de', '$2a$10$dummy_hash_employee', NOW(), '{"display_name": "Hans M", "first_name": "Hans", "last_name": "Mueller"}'::jsonb, NOW(), NOW()),
    ('55555555-5555-5555-5555-555555555555', 'customer1@firma.de', '$2a$10$dummy_hash_customer', NOW(), '{"display_name": "Klaus Richter", "first_name": "Klaus", "last_name": "Richter"}'::jsonb, NOW(), NOW()),
    ('t1111111-1111-1111-1111-111111111111', 'test-admin@test.de', '$2a$10$dummy_hash', NOW(), '{"display_name": "Test Admin"}'::jsonb, NOW(), NOW()),
    ('t2222222-2222-2222-2222-222222222222', 'test-employee@test.de', '$2a$10$dummy_hash', NOW(), '{"display_name": "Test Employee"}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Audit Log (for compliance)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.audit_log (tenant_id, user_id, action, entity_type, entity_id, metadata)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111', 'create', 'tenant', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '{"note": "ARIS tenant created"}'::jsonb),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111', 'create', 'user', '22222222-2222-2222-2222-222222222222', '{"note": "Manager account created"}'::jsonb);