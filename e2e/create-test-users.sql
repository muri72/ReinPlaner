-- Create test users for different roles

-- Admin user (already exists as aris@reinplaner.de)
-- Employee user (Mitarbeiter mit eingeschränkten Rechten)
-- Manager user (Leiter mit mehr Rechten)
-- Customer user (Kunde nur für Kundenbereich)

-- Create Employee (Mitarbeiter) account
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'ee1c0000-1111-1111-1111-111111111111',
  'mitarbeiter@reinplaner.de',
  crypt('Mitarbeiter2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"email": "mitarbeiter@reinplaner.de", "first_name": "Max"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (
  id,
  user_id,
  email,
  role,
  first_name,
  last_name,
  tenant_id,
  created_at
) VALUES (
  'ee1c0001-1111-1111-1111-111111111111',
  'ee1c0000-1111-1111-1111-111111111111',
  'mitarbeiter@reinplaner.de',
  'employee',
  'Max',
  'Müller',
  (SELECT id FROM tenants LIMIT 1),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create Manager account
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'ee2c0000-2222-2222-2222-222222222222',
  'manager@reinplaner.de',
  crypt('Manager2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"email": "manager@reinplaner.de", "first_name": "Anna"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (
  id,
  user_id,
  email,
  role,
  first_name,
  last_name,
  tenant_id,
  created_at
) VALUES (
  'ee2c0001-2222-2222-2222-222222222222',
  'ee2c0000-2222-2222-2222-222222222222',
  'manager@reinplaner.de',
  'manager',
  'Anna',
  'Schmidt',
  (SELECT id FROM tenants LIMIT 1),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create Customer account  
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'ee3c0000-3333-3333-3333-333333333333',
  'kunde@reinplaner.de',
  crypt('Kunde2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"email": "kunde@reinplaner.de", "first_name": "Klaus"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (
  id,
  user_id,
  email,
  role,
  first_name,
  last_name,
  tenant_id,
  created_at
) VALUES (
  'ee3c0001-3333-3333-3333-333333333333',
  'ee3c0000-3333-3333-3333-333333333333',
  'kunde@reinplaner.de',
  'customer',
  'Klaus',
  'Weber',
  (SELECT id FROM tenants LIMIT 1),
  NOW()
) ON CONFLICT (id) DO NOTHING;
