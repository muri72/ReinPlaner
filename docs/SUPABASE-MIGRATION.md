# Supabase Cloud to Self-Hosted Migration Plan

**Project:** ReinPlaner  
**Date:** 13 May 2026  
**Goal:** Migrate from Supabase Cloud (`db.<project>.supabase.co`) to self-hosted on Hetzner  
**Reference Stack:** `docs/SELF-HOSTED-SUPABASE.md` (docker-compose.prod.yml)

---

## Overview

This document describes a zero-downtime migration from Supabase Cloud to a self-hosted Supabase instance on Hetzner. The strategy uses a **parallel-run cutover** with a 7-day observation window before final DNS switchover and cloud decommission.

**Key components to migrate:**
- PostgreSQL database (schema + data)
- Auth users (auth.users table, JWT secrets)
- Storage buckets and files
- Edge Functions (send-email via Resend)
- Cron jobs (currently Next.js API routes, will be re-mapped)
- SMTP configuration (Resend)

---

## 1. Pre-Migration Audit

Run these queries against your Supabase Cloud PostgreSQL endpoint before any migration work.

### 1.1 Database Size

```sql
-- Connect: psql "postgresql://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:5432/postgres"
SELECT pg_size_pretty(pg_database_size('postgres'));
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE schemaname IN ('public', 'auth', 'storage', 'extensions')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;
```

### 1.2 Auth Users

```sql
-- Total auth users
SELECT COUNT(*) AS total_users FROM auth.users;

-- Users with identities
SELECT COUNT(*) AS users_with_identities FROM auth.identities;

-- Auth subscriptions (if using Realtime)
SELECT COUNT(*) AS authSubscriptions FROM auth.refresh_tokens;
```

### 1.3 Storage Files

```sql
-- Storage bucket sizes
SELECT id, name, owner, created_at,，楚然 size_bytes
FROM storage.objects
ORDER BY size_bytes DESC;
```

### 1.4 Edge Functions

```bash
# List deployed edge functions
supabase functions list

# Download send-email function code
supabase functions download send-email --output ./supabase/functions/send-email/
```

### 1.5 Cron Jobs

```sql
-- List pg_cron jobs (if enabled on cloud)
SELECT jobid, jobname, schedule, command FROM cron.job;
```

**Current cron routes in ReinPlaner** (Next.js API, not Supabase Edge):

| Route | File | Purpose |
|---|---|---|
| `/api/cron/mark-overdue-shifts` | `src/app/api/cron/mark-overdue-shifts/route.ts` | Mark overdue shifts |
| `/api/cron/daily-tasks` | `src/app/api/cron/daily-tasks/route.ts` | Daily email digest via Resend |
| `/api/cron/recurring-invoices` | `src/app/api/cron/recurring-invoices/route.ts` | Generate recurring invoices |
| `/api/cron/dunning` | `src/app/api/cron/dunning/route.ts` | Dunning emails via Resend |

These are Next.js Route Handlers — they run on the Next.js host (Vercel/Coolify), not Supabase Edge. **No pg_cron migration is needed** unless you have Supabase-specific scheduled functions.

### 1.6 SMTP / Email

Email is sent via **Resend** (configured as `RESEND_API_KEY` env var). This is a third-party service independent of Supabase Cloud — it works with both cloud and self-hosted. No migration needed, just ensure `RESEND_API_KEY` is set in the new environment.

---

## 2. pg_dump from Supabase Cloud

### 2.1 Dump Command

```bash
# Export from Supabase Cloud
# Connection: db.<PROJECT>.supabase.co, port 5432, user postgres
PGPASSWORD=<CLOUD_DB_PASSWORD> pg_dump \
  --host=db.<PROJECT>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --schema=extensions \
  --data-only \
  --rows-per-insert=1000 \
  --format=custom \
  --compress=9 \
  --file=./migration_dump_$(date +%Y%m%d).dump
```

### 2.2 Large Table Export (optional split)

For tables >5 GB, export individually:

```bash
# Example: large documents table
PGPASSWORD=<CLOUD_DB_PASSWORD> pg_dump \
  --host=db.<PROJECT>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --table=documents \
  --data-only \
  --format=custom \
  --file=./documents.dump
```

### 2.3 Auth-Specific Dump

```bash
# Dump auth schema separately (includes users, identities, sessions)
PGPASSWORD=<CLOUD_DB_PASSWORD> pg_dump \
  --host=db.<PROJECT>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=auth \
  --format=plain \
  --file=./auth_schema.sql
```

---

## 3. pg_restore to Self-Hosted

### 3.1 Prepare Self-Hosted Database

```bash
# Start the self-hosted stack (from docs/SELF-HOSTED-SUPABASE.md)
cd /opt/reinplaner
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for postgres to be healthy
docker healthcheck inspect supabase_postgres  # or wait ~30s
```

### 3.2 Restore Dump

```bash
# Restore to self-hosted postgres (direct connection)
docker exec -i supabase_postgres \
  pg_restore \
    --username=supabase_admin \
    --dbname=postgres \
    --data-only \
    --schema=public \
    --schema=auth \
    --schema=storage \
    --schema=extensions \
    --no-owner \
    --no-acl \
    --rows-per-insert=1000 \
    < ./migration_dump_YYYYMMDD.dump
```

### 3.3 Restore Auth Schema (if dumped separately)

```bash
docker exec -i supabase_postgres psql \
  --username=supabase_admin \
  --dbname=postgres \
  < ./auth_schema.sql
```

### 3.4 Set Sequences and Auto-Increment

```sql
-- Run on self-hosted after restore to fix sequences
SELECT 'SELECT setval(' || quote_literal(quote_ident(nspname) || '.' || seqname)
       || ', COALESCE(MAX(' || quote_ident.attname || '), 0) + 1, true) FROM '
       || quote_ident(nspname) || '.' || quote_ident(relname) || ';'
FROM pg_class AS cl
JOIN pg_namespace AS ns ON ns.oid = relnamespace
JOIN pg_depend AS dep ON dep.refobjid = cl.oid
JOIN pg_attribute AS att ON att.attrelid = cl.oid
WHERE dep.deptype = 'a' AND dep.refclassid = 'pg_class'::regclass
  AND att.attnum = dep.refobjsubid
  AND seqrelid = cl.oid;
```

---

## 4. Auth Migration

### 4.1 Migrate auth.users

The `auth.users` table is included in the standard pg_dump above. After restore, verify:

```sql
-- Check user count matches cloud
SELECT COUNT(*) FROM auth.users;

-- Verify no orphaned identities
SELECT COUNT(*) FROM auth.identities i
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id);
```

### 4.2 JWT Secrets

You must generate new JWT secrets for the self-hosted instance. Supabase Cloud uses its own signing keys.

```bash
# Generate new JWT secret (32+ random bytes, base64 encoded)
openssl rand -base64 32

# Or via Deno:
# deno eval "console.log(btoa(crypto.getRandomValues(new Uint8Array(32))))"
```

Add to your `.env` on the Hetzner server:

```bash
JWT_SECRET=<NEW_GENERATED_SECRET>
ANON_KEY=<NEW_ANON_KEY>       # Generate: openssl rand -base64 32
SERVICE_ROLE_KEY=<NEW_SERVICE_KEY>  # Generate: openssl rand -base64 32
```

**⚠️ Warning:** Changing JWT secrets will invalidate all existing user sessions. Users will need to re-authenticate after cutover.

### 4.3 Auth-related Tables

Restore these schemas in order:

```bash
# 1. Extensions first
docker exec -i supabase_postgres psql -U supabase_admin -d postgres < supabase/migrations/20260413221000_add_performance_indexes.sql

# 2. Auth schema (users, sessions, identities)
docker exec -i supabase_postgres pg_restore -U supabase_admin -d postgres --schema=auth --data-only < auth.dump

# 3. Storage schema
docker exec -i supabase_postgres pg_restore -U supabase_admin -d postgres --schema=storage --data-only < storage.dump
```

---

## 5. Edge Functions Re-Deploy

### 5.1 send-email Function

The `send-email` edge function is located at:

```
supabase/functions/send-email/index.ts
```

**Deno runtime environment variables needed:**

```bash
# On Hetzner server, in .env
JWT_SECRET=<NEW_JWT_SECRET>
SUPABASE_URL=http://kong:54321
SUPABASE_ANON_KEY=<NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_KEY>
SUPABASE_DB_URL=postgres://supabase_admin:<POSTGRES_PASSWORD>@postgres:5432/postgres
VERIFY_JWT=true
# Resend (already configured in Next.js, also needed here)
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
RESEND_FROM_EMAIL=ReinPlaner <noreply@reinplaner.de>
```

**To serve the function via the self-hosted kong gateway**, ensure the function is mounted in `docker-compose.prod.yml`:

```yaml
# In docker-compose.prod.yml, the functions service already mounts:
volumes:
  - ./supabase/functions:/home/deno/functions:ro

# The kong.prod.yml routes /functions/* to the functions service
# Verify send-email is at: supabase/functions/send-email/index.ts
```

### 5.2 Re-deploy Steps

```bash
# 1. Copy function code to server
rsync -avz ./supabase/functions/ user@hetzner:/opt/reinplaner/supabase/functions/

# 2. Restart functions container
docker-compose -f /opt/reinplaner/docker-compose.prod.yml restart functions

# 3. Verify health
curl http://localhost:9000/status
```

---

## 6. Storage Migration

### 6.1 Download Files from Supabase Cloud

```bash
# Using Supabase CLI
supabase login
supabase link --project-ref <PROJECT_REF>
supabase storage download bucket-name remote/path --output ./local/path

# Or via the Storage API (list + download each file)
# See: https://supabase.com/docs/guides/storage/s3/fetching-files
```

### 6.2 Upload to Self-Hosted Storage

```bash
# Using Supabase CLI against local instance
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_KEY=<SERVICE_ROLE_KEY> \
supabase storage upload bucket-name ./local/path --upsert
```

### 6.3 Storage Service Verification

```bash
# Check storage health
curl http://localhost:5000/status

# Test file access
curl -I http://localhost:54321/storage/v1/object/bucket-name/file-path
```

### 6.4 Bucket Permissions

After migration, verify RLS policies on `storage.objects`:

```sql
-- Check bucket policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE tablename = 'objects';
```

---

## 7. Zero-Downtime Cutover Plan

### Phase 1: Parallel Run Setup (Days 1–2)

1. **Provision self-hosted instance** on Hetzner (docs/SELF-HOSTED-SUPABASE.md)
2. **Run migrations** (pg_dump → pg_restore, storage copy, function deploy)
3. **Configure Resend** — same `RESEND_API_KEY` works for both cloud and self-hosted
4. **Test in isolation** — do NOT point DNS to new server yet

```bash
# Verify local instance is healthy
curl https://your-new-server.com/health
curl https://your-new-server.com/rest/v1/ --header "apikey: <ANON_KEY>"
```

### Phase 2: Parallel Run (Days 3–7)

**Run both cloud and self-hosted simultaneously, with traffic split.**

1. **Update `NEXT_PUBLIC_SUPABASE_URL`** in your Next.js config to point to self-hosted:

```typescript
// For gradual switchover, use environment-based routing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Cloud: https://<PROJECT>.supabase.co
// Self-hosted: https://your-new-server.com
```

2. **Gradual traffic split** — use feature flags or DNS-weighted routing:

| Method | How |
|---|---|
| Feature flag | `process.env.USE_SELF_HOSTED=true` in Vercel env vars |
| DNS weighted | 10% → 50% → 100% over 3 days |
| Vercel environment | Separate preview deploy pointing to self-hosted |

3. **Monitor for 7 days:**
   - API latency (cloud vs self-hosted)
   - Auth success rates
   - Storage upload/download success
   - Edge function response times
   - Error rates in application logs

### Phase 3: DNS Switchover (Day 7+)

Once satisfied with parallel run:

1. **Update DNS** at your registrar:

```
# Replace cloud Supabase DNS with your Hetzner server IP
# Point your Supabase domain (or API subdomain) to the new server
# Update SUPABASE_STUDIO_URL in docker-compose.prod.yml
```

2. **Remove cloud dependency** from Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-self-hosted-domain.com
```

3. **Restart Next.js** to pick up new Supabase URL

### Phase 4: Decommission Cloud (after 30 days)

```bash
# 1. Export final backup from cloud (just in case)
PGPASSWORD=<CLOUD_PASSWORD> pg_dump --host=db.<PROJECT>.supabase.co \
  --port=5432 --username=postgres --dbname=postgres --format=plain \
  --file=cloud_final_backup.sql

# 2. Download any remaining storage files
# (repeat storage download for any new files created during parallel run)

# 3. Cancel Supabase Cloud project via dashboard
# https://supabase.com/dashboard/project/<PROJECT>/settings/general
```

---

## 8. Rollback Plan

### Immediate Rollback (< 24 hours)

1. **Revert DNS** — point back to Supabase Cloud
2. **Set `NEXT_PUBLIC_SUPABASE_URL`** back to `https://<PROJECT>.supabase.co`
3. **Restart Next.js** on Vercel
4. **Users reconnect** to cloud — sessions may be invalidated if JWT was rotated

### If JWT Secret Was Rotated

If you rotated `JWT_SECRET` during migration but need to roll back to cloud:

- JWT sessions issued by self-hosted **will not work** on cloud (different signing key)
- Users must re-authenticate after switching back

### If Data Was Written During Parallel Run

If writes occurred on self-hosted during parallel run:

1. Use `supabase db diff` or manual SQL to identify divergent rows
2. Apply writes back to cloud database manually, OR
3. Accept data as-is if self-hosted is authoritative going forward

### Rollback Checklist

- [ ] Revert `NEXT_PUBLIC_SUPABASE_URL` in Vercel/Coolify env vars
- [ ] Revert DNS records
- [ ] Verify Supabase Cloud console access (project not yet deleted)
- [ ] Confirm auth users can log in
- [ ] Confirm storage files accessible
- [ ] Check for 5xx errors in application logs

---

## 9. Post-Migration Verification Checklist

Run through all checks after cutover:

### Database
- [ ] `SELECT COUNT(*) FROM auth.users` matches pre-migration count
- [ ] All application tables have correct row counts
- [ ] Sequences (`nextval`) are at correct positions
- [ ] RLS policies are in place (`SELECT schemaname, policyname FROM pg_policies`)
- [ ] Extensions loaded (`SELECT extname FROM pg_extension`)

### Auth
- [ ] New user registration works
- [ ] Existing user login works
- [ ] Password reset flow works
- [ ] `auth.users` table accessible from PostgREST

### Storage
- [ ] `curl http://localhost:5000/status` returns 200
- [ ] File upload works via application
- [ ] File download via signed URL works
- [ ] Images served via imgproxy work

### Edge Functions
- [ ] `curl http://localhost:9000/status` returns 200
- [ ] `/functions/send-email` reachable via Kong
- [ ] Emails sent via Resend (check Resend dashboard for delivery)

### API
- [ ] PostgREST responds: `curl http://localhost:54321/rest/v1/` → 200
- [ ] Kong admin: `curl http://localhost:8001` → 200
- [ ] Supabase Studio accessible: `curl http://localhost:3000/api/health` → 200

### Cron / Background Jobs
- [ ] `/api/cron/mark-overdue-shifts` responds correctly
- [ ] `/api/cron/daily-tasks` emails are sent (check Resend)
- [ ] `/api/cron/recurring-invoices` runs without error
- [ ] `/api/cron/dunning` emails are sent (check Resend)

### Environment Variables (Self-Hosted)

```bash
# Complete env list needed on Hetzner server
POSTGRES_PASSWORD=<NEW_PASSWORD>
JWT_SECRET=<NEW_JWT_SECRET>
ANON_KEY=<NEW_ANON_KEY>
SERVICE_ROLE_KEY=<NEW_SERVICE_KEY>
META_ADMIN_TOKEN=<NEW_META_TOKEN>
SUPABASE_STUDIO_URL=https://your-studio-domain.com

# SMTP / Email
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
RESEND_FROM_EMAIL=ReinPlaner <noreply@reinplaner.de>
SMTP_ADMIN_EMAIL=admin@reinplaner.de
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_<YOUR_KEY>

# Backup
BACKUP_HOUR=02
BACKUP_MINUTE=00
```

---

## Appendix: Quick Reference Commands

```bash
# Start self-hosted stack
docker-compose -f /opt/reinplaner/docker-compose.prod.yml up -d

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# View logs
docker logs supabase_postgres --tail=100
docker logs supabase_kong --tail=100
docker logs supabase_functions --tail=100

# pg_dump from cloud
pg_dump --host=db.<PROJECT>.supabase.co --port=5432 \
  --username=postgres --dbname=postgres --format=custom \
  --file=migration.dump

# pg_restore to self-hosted
docker exec -i supabase_postgres pg_restore \
  --username=supabase_admin --dbname=postgres --data-only < migration.dump

# Restart functions after code update
docker-compose -f /opt/reinplaner/docker-compose.prod.yml restart functions

# Test Kong health
curl http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY"
```
