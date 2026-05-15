# ReinPlaner — Migration Plan: Supabase Cloud → Self-Hosted

**Date:** 13 May 2026
**Project:** ReinPlaner
**Goal:** Migrate from Supabase Cloud to self-hosted Supabase on Hetzner via Coolify
**Total Estimated Time:** 5–8 hours
**Branch:** `dev` (staging first, then `master` for production)

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Pre-Migration Audit](#2-pre-migration-audit)
3. [Phase 1: Server Setup & Coolify (1–1.5h)](#phase-1-server-setup--coolify-1--15h)
4. [Phase 2: Self-Hosted Supabase Stack (1.5–2h)](#phase-2-self-hosted-supabase-stack-15--2h)
5. [Phase 3: Database Migration (1–2h)](#phase-3-database-migration-1--2h)
6. [Phase 4: Coolify App Deployment (1h)](#phase-4-coolify-app-deployment-1h)
7. [Phase 5: Parallel Run & DNS Cutover (1h)](#phase-5-parallel-run--dns-cutover-1h)
8. [Rollback Plan](#rollback-plan)
9. [Post-Migration Verification](#post-migration-verification)
10. [Quick Reference Card](#10-quick-reference-card)

---

## 1. Overview & Architecture

### What Is Being Migrated

| Component | From | To |
|---|---|---|
| Database | Supabase Cloud (`db.<project>.supabase.co`) | Self-hosted Postgres 15 on Hetzner |
| Auth | Supabase Cloud | Self-hosted (new JWT secrets) |
| Storage | Supabase Cloud buckets | Self-hosted Storage service |
| Edge Functions | Supabase Cloud | Self-hosted Deno runtime |
| API Gateway | Supabase Cloud | Self-hosted Kong |
| Email | Resend (unchanged) | Resend (unchanged) |
| Application | Vercel (or current host) | Coolify on Hetzner |

### Target Architecture

```
Internet
    │
    ▼
Coolify (Port 8000 + reverse proxy)
    │
    ├──► Next.js App (dev.reinplaner.de) — Port 3000
    │
    ▼
Self-Hosted Supabase Stack (Docker internal network)
    ├── Kong Gateway       :54321  (API)
    ├── Postgres           :5432   (data)
    ├── Studio             :3000   (Dashboard)
    ├── Storage            :5000   (S3-compatible)
    ├── Functions          :9000   (Edge functions)
    ├── Analytics          :5437
    ├── PostgREST          :3000   (behind Kong)
    ├── Postgres Meta       :54381
    ├── Realtime           :3500
    ├── Imgproxy           :5001
    └── Backup             :54320
```

### Branch-to-Environment Mapping

| GitHub Branch | Coolify Environment | Domain |
|---|---|---|
| `dev` | `development` | `dev.reinplaner.de` |
| `master` | `production` | `reinplaner.de` |

### What Is NOT Being Migrated (Unchanged)

- **Resend** — `RESEND_API_KEY` works with both cloud and self-hosted
- **Cron jobs** — running as Next.js API route handlers on the app server, not pg_cron
- **GitHub repository** — stays at `github.com/muri72/ReinPlaner`

---

## 2. Pre-Migration Audit

Run these queries against your Supabase Cloud database before starting. Record outputs for comparison post-migration.

### 2.1 Database Size

```bash
PGPASSWORD=<CLOUD_DB_PASSWORD> psql \
  --host=db.<PROJECT>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --command="SELECT pg_size_pretty(pg_database_size('postgres'));"
```

### 2.2 Table Sizes

```sql
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage', 'extensions')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;
```

### 2.3 User Counts

```sql
SELECT COUNT(*) AS total_users FROM auth.users;
SELECT COUNT(*) AS users_with_identities FROM auth.identities;
SELECT COUNT(*) AS refresh_tokens FROM auth.refresh_tokens;
```

### 2.4 Storage Buckets

```sql
SELECT id, name, owner, created_at, size_bytes
FROM storage.objects
ORDER BY size_bytes DESC;
```

### 2.5 Record Outputs

Save these values:

| Metric | Value |
|---|---|
| Total DB size | |
| Total users | |
| Total storage bytes | |
| Largest table | |

---

## Phase 1: Server Setup & Coolify (1–1.5h)

### Step 1.1 — SSH into Server

```bash
ssh root@<YOUR_SERVER_IP>
```

### Step 1.2 — Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

**Verification:**

```bash
curl -s http://localhost:8000 | head -5
# Expected: HTML response from Coolify
```

> **Coolify installs:** Docker, Docker Compose, Nginx reverse proxy, Coolify on port 8000, non-root user `coolify`.

### Step 1.3 — Coolify First-Run Setup

1. Open `http://<YOUR_SERVER_IP>:8000` in browser
2. Create admin password
3. Configure public domain (optional, e.g. `coolify.reinplaner.de`)
4. Generate/upload SSH key for Git access

### Step 1.4 — Configure DNS for Coolify (Optional)

Set DNS A record: `coolify.reinplaner.de` → `<SERVER_IP>`

Then add in Coolify: **Settings → Public Domains**

**Verification:**

```bash
dig A coolify.reinplaner.de +short
# Expected: <SERVER_IP>
```

### Step 1.5 — Connect GitHub Repository

**Option A — GitHub App (recommended):**
1. **Sources → Add Source → GitHub → Install GitHub App**
2. Authorize on GitHub, select `muri72/ReinPlaner`
3. Return to Coolify, select the source

**Option B — Personal Access Token:**
1. GitHub → **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Create token with `repo` scope
3. Coolify → **Sources → Add Source → GitHub → Use PAT**
4. Paste token

### Step 1.6 — Create Coolify Environments

Create two environments in Coolify:

**Production:**
| Field | Value |
|---|---|
| Name | `production` |
| Default Domain | `reinplaner.de` |
| SSL | ✅ Enabled (Let's Encrypt) |

**Development:**
| Field | Value |
|---|---|
| Name | `development` |
| Default Domain | `dev.reinplaner.de` |
| SSL | ✅ Enabled (Let's Encrypt) |

---

## Phase 2: Self-Hosted Supabase Stack (1.5–2h)

### Step 2.1 — Create Directory Structure

```bash
mkdir -p /opt/reinplaner/supabase/{migrations,functions,seed}
mkdir -p /opt/reinplaner/backups
mkdir -p /data/supabase/{postgres,storage,backups/{pgbackrest,logs,daily},pgadmin}
mkdir -p /var/log/caddy
cd /opt/reinplaner
```

### Step 2.2 — Copy Project Files to Server

From your local machine:

```bash
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ./ReinPlaner/* root@<YOUR_SERVER_IP>:/opt/reinplaner/
```

⚠️ **Critical:** Ensure `docker-compose.prod.yml`, `supabase/kong.prod.yml`, and `.env.prod` are on the server.

### Step 2.3 — Generate Secrets

```bash
# Run on server
openssl rand -base64 32   # → JWT_SECRET
openssl rand -base64 32   # → ANON_KEY
openssl rand -base64 32   # → SERVICE_ROLE_KEY
openssl rand -base64 32   # → META_ADMIN_TOKEN
openssl rand -base64 32   # → POSTGRES_PASSWORD
```

### Step 2.4 — Create .env File

```bash
nano /opt/reinplaner/.env
```

```bash
# ============================================================
# ReinPlaner — Self-Hosted Supabase Environment
# ============================================================

# PostgreSQL
POSTGRES_PASSWORD=<STRONG_PASSWORD>

# JWT (generate: openssl rand -base64 32)
JWT_SECRET=<JWT_SECRET>
ANON_KEY=<ANON_KEY>
SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
META_ADMIN_TOKEN=<META_ADMIN_TOKEN>

# URLs
SUPABASE_STUDIO_URL=https://studio.reinplaner.de

# SMTP / Resend
SMTP_ADMIN_EMAIL=admin@reinplaner.de
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_<YOUR_KEY>
RESEND_API_KEY=<YOUR_RESEND_API_KEY>

# Backup
BACKUP_HOUR=02
BACKUP_MINUTE=00
```

### Step 2.5 — Create Docker Volumes

```bash
docker volume create --driver local \
  --opt type=none --opt o=bind \
  --opt device=/data/supabase/postgres \
  supabase_postgres_data

docker volume create --driver local \
  --opt type=none --opt o=bind \
  --opt device=/data/supabase/storage \
  supabase_storage_data

docker volume create --driver local \
  --opt type=none --opt o=bind \
  --opt device=/data/supabase/backups/pgbackrest \
  supabase_backup_repo

docker volume create --driver local \
  --opt type=none --opt o=bind \
  --opt device=/data/supabase/backups/logs \
  supabase_backup_logs
```

### Step 2.6 — Start Supabase Stack (Postgres First)

```bash
cd /opt/reinplaner
set -a && source .env && set +a

# Start Postgres only first (~30 seconds)
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for Postgres to be healthy
sleep 30
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Verification:**

```bash
docker exec supabase_postgres pg_isready -U supabase_admin -d postgres
# Expected: "accepting connections"
```

### Step 2.7 — Start Remaining Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 2.8 — Verify All Containers

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

All containers should show `Up` (healthy). Expected containers:

| Container | Expected Status |
|---|---|
| supabase_postgres | healthy |
| supabase_kong | healthy |
| supabase_postgrest | healthy |
| supabase_studio | healthy |
| supabase_meta | healthy |
| supabase_realtime | healthy |
| supabase_storage | healthy |
| supabase_functions | healthy |
| supabase_analytics | healthy |
| supabase_imgproxy | healthy |
| supabase_backup | healthy |

### Step 2.9 — Verify Internal Service Endpoints

```bash
curl http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY"
# Expected: {"_kong":"","swagger":"2.0","info":...

curl http://localhost:3000/api/health
# Expected: HTTP 200

curl http://localhost:5000/status
# Expected: HTTP 200

curl http://localhost:9000/status
# Expected: HTTP 200

curl http://localhost:54381/health
# Expected: HTTP 200

curl http://localhost:5437/health
# Expected: HTTP 200
```

### Step 2.10 — DNS Configuration

Set the following DNS records at your registrar:

| Name | Type | Value | TTL |
|---|---|---|---|
| `dev.reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `www.reinplaner.de` | CNAME | `dev.reinplaner.de` | 300 |

**Verification:**

```bash
dig A dev.reinplaner.de +short
# Expected: <SERVER_IP>

dig A reinplaner.de +short
# Expected: <SERVER_IP>

dig CNAME www.reinplaner.de +short
# Expected: dev.reinplaner.de.
```

> **Cloudflare users:** Set proxy to "DNS only" (grey cloud) during setup. Switch to "Proxied" (orange cloud) after SSL verification.

---

## Phase 3: Database Migration (1–2h)

### Step 3.1 — Pre-Migration Backup from Supabase Cloud

```bash
# Run from your local machine (not the server)
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

### Step 3.2 — Copy Dump to Server

```bash
scp ./migration_dump_YYYYMMDD.dump root@<YOUR_SERVER_IP>:/opt/reinplaner/
```

### Step 3.3 — Restore Dump to Self-Hosted Postgres

```bash
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
    < /opt/reinplaner/migration_dump_YYYYMMDD.dump
```

### Step 3.4 — Fix Sequences

```sql
docker exec -i supabase_postgres psql -U supabase_admin -d postgres \
  --command="
SELECT 'SELECT setval(' || quote_literal(quote_ident(nspname) || '.' || seqname)
       || ', COALESCE(MAX(' || quote_ident(attname) || '), 0) + 1, true) FROM '
       || quote_ident(nspname) || '.' || quote_ident(relname) || ';'
FROM pg_class AS cl
JOIN pg_namespace AS ns ON ns.oid = relnamespace
JOIN pg_depend AS dep ON dep.refobjid = cl.oid
JOIN pg_attribute AS att ON att.attrelid = cl.oid
WHERE dep.deptype = 'a' AND dep.refclassid = 'pg_class'::regclass
  AND att.attnum = dep.refobjsubid
  AND seqrelid = cl.oid;
" | psql -U supabase_admin -d postgres
```

### Step 3.5 — Verify Auth Users Restored

```sql
docker exec supabase_postgres psql -U supabase_admin -d postgres \
  --command="SELECT COUNT(*) FROM auth.users;"
```

Compare count with pre-migration audit from Step 2.3.

### Step 3.6 — Verify No Orphaned Identities

```sql
docker exec supabase_postgres psql -U supabase_admin -d postgres \
  --command="SELECT COUNT(*) FROM auth.identities i WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id);"
```

Expected: `0`

### Step 3.7 — ⚠️ JWT Secret Rotation

⚠️ **This invalidates all existing user sessions. Users must re-authenticate after cutover.**

Generate new JWT secrets on the server:

```bash
openssl rand -base64 32   # JWT_SECRET
openssl rand -base64 32   # ANON_KEY
openssl rand -base64 32   # SERVICE_ROLE_KEY
```

Update `/opt/reinplaner/.env` with new values, then restart Kong:

```bash
set -a && source /opt/reinplaner/.env && set +a
docker-compose -f /opt/reinplaner/docker-compose.prod.yml restart kong
```

### Step 3.8 — Deploy Edge Functions

```bash
# Copy function code to server (if not already there)
rsync -avz ./supabase/functions/ root@<YOUR_SERVER_IP>:/opt/reinplaner/supabase/functions/

# Restart functions container
docker-compose -f /opt/reinplaner/docker-compose.prod.yml restart functions
```

**Verification:**

```bash
curl http://localhost:9000/status
# Expected: HTTP 200
```

### Step 3.9 — Storage Migration

Download files from Supabase Cloud using the Storage API, then upload to self-hosted:

```bash
# Using Supabase CLI against local instance
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_KEY=<SERVICE_ROLE_KEY> \
supabase storage upload bucket-name ./local/path --upsert
```

**Verification:**

```bash
curl http://localhost:5000/status
# Expected: HTTP 200
```

---

## Phase 4: Coolify App Deployment (1h)

### Step 4.1 — Create Coolify Project

1. **Projects → New Project → Create Project**
2. Name: `ReinPlaner`

### Step 4.2 — Create Development Application

1. **Add New Resource → Application**
2. **GitHub**: Select `muri72/ReinPlaner`
3. **Branch**: `dev`
4. **Build Pack**: `Nixpacks` (auto-detects Next.js) or `Dockerfile`
5. **Environment**: `development`
6. **Port**: `3000`
7. **Domain**: `dev.reinplaner.de`

**Deployment Settings:**

- ✅ **Autodeploy**: On push to `dev`
- **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
- **Start Command**: `pnpm start`

### Step 4.3 — Environment Variables (Development)

Add these in **Environment Variables** section:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de
RESEND_API_KEY=<RESEND_API_KEY>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Step 4.4 — Deploy Development App

Click **Deploy** in Coolify.

**Verification (after deploy):**

```bash
curl -s -o /dev/null -w "%{http_code}" https://dev.reinplaner.de
# Expected: 200

curl -s https://dev.reinplaner.de/api/health
# Expected: HTTP 200
```

### Step 4.5 — Create Production Application

1. **Add New Resource → Application**
2. **GitHub**: Select `muri72/ReinPlaner`
3. **Branch**: `master`
4. **Build Pack**: `Nixpacks`
5. **Environment**: `production`
6. **Port**: `3000`
7. **Domain**: `reinplaner.de`

### Step 4.6 — Environment Variables (Production)

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_BASE_URL=https://reinplaner.de
RESEND_API_KEY=<RESEND_API_KEY>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Step 4.7 — Disable Autodeploy on Production First

⚠️ Turn off **Autodeploy** on `master` branch until parallel run is verified.

### Step 4.8 — Deploy Production App Manually

Click **Deploy** to trigger first build.

**Verification:**

```bash
curl -s -o /dev/null -w "%{http_code}" https://reinplaner.de
# Expected: 200

curl -s https://reinplaner.de/api/health
# Expected: HTTP 200
```

---

## Phase 5: Parallel Run & DNS Cutover (1h)

### Step 5.1 — Parallel Run Setup

1. Both Supabase Cloud and self-hosted are now running
2. Development app in Coolify is pointing to self-hosted Supabase
3. Test all functionality on `dev.reinplaner.de`

### Step 5.2 — Functional Smoke Tests (Development)

- [ ] Login / registration works on `dev.reinplaner.de`
- [ ] Auth users table shows correct count
- [ ] File upload works (storage)
- [ ] Email sending works (Resend dashboard)
- [ ] API requests succeed (`/rest/v1/` returns data)

### Step 5.3 — Run for 30–60 Minutes in Parallel

Monitor application logs in Coolify for any errors.

### Step 5.4 — DNS Switchover to Self-Hosted

Once parallel run is stable:

1. Update DNS A record: `reinplaner.de` → `<SERVER_IP>`
2. Set TTL to 300 for faster propagation

**Verification:**

```bash
dig A reinplaner.de +short
# Expected: <SERVER_IP>

# Wait 5 min for propagation, then test
curl -s -o /dev/null -w "%{http_code}" https://reinplaner.de
# Expected: 200
```

### Step 5.5 — Enable Autodeploy on Production

Turn **Autodeploy** back on for `master` branch now that self-hosted is live.

### Step 5.6 — Final Verification Checklist

**Application:**
- [ ] `https://reinplaner.de` returns HTTP 200
- [ ] Login / registration works
- [ ] No JS console errors

**Supabase API:**
- [ ] `curl http://localhost:54321/rest/v1/` → HTTP 200
- [ ] Auth: new user registration works
- [ ] Storage: file upload works
- [ ] Functions: `/functions/send-email` reachable

**SSL:**
- [ ] `https://reinplaner.de` shows valid TLS certificate
- [ ] `https://dev.reinplaner.de` shows valid TLS certificate

**Database:**
- [ ] `SELECT COUNT(*) FROM auth.users` matches pre-migration count
- [ ] All application tables accessible

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

1. **Revert DNS** — point `reinplaner.de` A record back to previous IP (Vercel/Supabase Cloud)
2. **Re-enable autodeploy** on previous deployment system
3. **Restart application** to pick up old `NEXT_PUBLIC_SUPABASE_URL`
4. **Users reconnect** — may need to re-authenticate if JWT was rotated

### Rollback Decision Tree

```
Problem detected
    │
    ├─► Database unreachable?     → Check Postgres container + health
    ├─► Auth broken?              → Verify JWT_SECRET in .env + Kong logs
    ├─► Storage broken?          → Check storage container + volume mounts
    ├─► App won't start?         → Coolify rollback button (instant)
    └─► All services down?       → Rollback DNS + revert to Supabase Cloud
```

### Rollback Commands

```bash
# Coolify instant rollback (no rebuild)
# Application → Deployments → last working version → ↩️ Rollback button

# Manual Git rollback
git checkout <previous-commit-hash>
git pull origin master
# Coolify detects change and redeploys

# Check which container is failing
docker ps --format "table {{.Names}}\t{{.Status}}"
docker logs supabase_postgres --tail=50
docker logs supabase_kong --tail=50
```

### Rollback Checklist

- [ ] Revert `NEXT_PUBLIC_SUPABASE_URL` in Coolify env vars
- [ ] Revert DNS records to previous values
- [ ] Verify Supabase Cloud console still accessible
- [ ] Confirm auth users can log in
- [ ] Confirm storage files accessible
- [ ] Check for 5xx errors in application logs

---

## Post-Migration Verification

### Database
- [ ] `SELECT COUNT(*) FROM auth.users` matches pre-migration count
- [ ] All application tables have correct row counts
- [ ] Sequences are at correct positions
- [ ] RLS policies in place
- [ ] Extensions loaded

### Auth
- [ ] New user registration works
- [ ] Existing user login works
- [ ] Password reset flow works
- [ ] `auth.users` table accessible from PostgREST

### Storage
- [ ] `curl http://localhost:5000/status` returns 200
- [ ] File upload works
- [ ] Images served via imgproxy work

### API
- [ ] PostgREST: `curl http://localhost:54321/rest/v1/` → 200
- [ ] Kong admin: `curl http://localhost:8001` → 200
- [ ] Studio: `curl http://localhost:3000/api/health` → 200

### Email
- [ ] Resend dashboard shows emails delivered
- [ ] Transactional emails (welcome, password reset) send correctly

### Cron / Background Jobs
- [ ] `/api/cron/mark-overdue-shifts` responds correctly
- [ ] `/api/cron/daily-tasks` emails are sent
- [ ] `/api/cron/recurring-invoices` runs without error
- [ ] `/api/cron/dunning` emails are sent

---

## 10. Quick Reference Card

### Server Access
```bash
ssh root@<YOUR_SERVER_IP>
cd /opt/reinplaner
```

### Supabase Stack Commands
```bash
# Start all
docker-compose -f docker-compose.prod.yml up -d

# Stop all
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart kong

# View logs
docker logs supabase_postgres --tail=100
docker logs supabase_kong --tail=100
docker logs supabase_functions --tail=100

# Check health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Database Commands
```bash
# Connect to Postgres
docker exec -it supabase_postgres psql -U supabase_admin -d postgres

# pg_dump from cloud
PGPASSWORD=<CLOUD_PASS> pg_dump \
  --host=db.<PROJECT>.supabase.co --port=5432 \
  --username=postgres --dbname=postgres --format=custom \
  --file=migration.dump

# pg_restore to self-hosted
docker exec -i supabase_postgres pg_restore \
  --username=supabase_admin --dbname=postgres --data-only \
  < migration.dump
```

### Coolify Commands
```bash
# Update Coolify
cd ~/coolify && docker compose pull && docker compose up -d

# Check Coolify status
sudo systemctl status coolify

# View Coolify logs
sudo journalctl -u coolify -f
```

### Health Check
```bash
curl http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY"
curl http://localhost:3000/api/health
curl http://localhost:5000/status
curl http://localhost:9000/status
curl http://localhost:54381/health
curl http://localhost:5437/health
```

### DNS Verification
```bash
dig A dev.reinplaner.de +short
dig A reinplaner.de +short
dig CNAME www.reinplaner.de +short
```

### Environment Variables (Production — Coolify)
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_BASE_URL=https://reinplaner.de
RESEND_API_KEY=<RESEND_API_KEY>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Image Tags (Pinned Versions)
| Service | Image | Tag |
|---|---|---|
| postgres | supabase/postgres | 15.6.1.147 |
| kong | supabase/kong | 2.8.1 |
| studio | supabase/studio | 20241028-91ff1ce |
| postgrest | supabase/postgrest | 20241028-91ff1ce |
| meta | supabase/postgres-meta | 20241028-91ff1ce |
| realtime | supabase/realtime | 20241028-91ff1ce |
| storage | supabase/storage | 20241028-91ff1ce |
| functions | supabase/edge-runtime | 20241028-91ff1ce |
| analytics | supabase/postgres-analytics | 20241028-91ff1ce |
| imgproxy | supabase/imgproxy | 20241028-91ff1ce |
| backup | supabase/postgres-backup | 20241028-91ff1ce |
| pgadmin | dpage/pgadmin4 | 8.10 |

### Timeline Summary
| Phase | Duration | What |
|---|---|---|
| Phase 1 | 1–1.5h | Server setup + Coolify + GitHub |
| Phase 2 | 1.5–2h | Supabase stack deployment |
| Phase 3 | 1–2h | Database migration (pg_dump → restore) |
| Phase 4 | 1h | Coolify app deployment |
| Phase 5 | 1h | Parallel run + DNS cutover |
| **Total** | **5–8h** | |
