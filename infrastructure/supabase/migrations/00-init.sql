-- Initialize auth schema for Supabase

CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA auth;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA auth;

-- anon and authenticated roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT ALL ON SCHEMA auth TO anon, authenticated;

-- Storage schema
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON SCHEMA storage TO anon, authenticated;
