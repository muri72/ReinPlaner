# Self-Hosted Supabase — Production Stack für ReinPlaner

**Datum:** 13. Mai 2026  
**Server:** 48 GB RAM, Ubuntu Linux  
**Ziel:** Supabase Cloud → Self-Hosted (Docker)  
**Dokumentationstyp:** Operations Guide

---

## 1. Benötigte Supabase-Services für ReinPlaner

### Service-Analyse

| Service | Status in ReinPlaner | Brauchen wir es? | Begründung |
|---|---|---|---|
| **PostgreSQL + PostgREST** | ✅ Hauptdatenbank | ✅ **Pflicht** | Kern-DB mit Auto-API, RLS, Multi-Tenancy |
| **Auth (GoTrue)** | ✅ Supabase Auth | ✅ **Pflicht** | Login, Magic Link, OAuth, RLS-Integration |
| **Realtime (Phoenix)** | ✅ Shift-Status, Notifications | ✅ **Pflicht** | `notification-bell.tsx`, `shift-card.tsx` nutzen Realtime-Channels |
| **Storage (MinIO/S3)** | ⚠️ Nicht genutzt | ❌ **Optional** | Aktuell kein `storage.upload` in Code gefunden |
| **Edge Functions (Deno)** | ⚠️ Nicht genutzt | ❌ **Optional** | Keine Edge Functions im Use-Case |
| **Kong (API Gateway)** | ✅ API-Routing | ✅ **Pflicht** | Basis-Routing für alle Services |
| **Studio (Dashboard)** | ✅ Lokale Verwaltung | ✅ **Pflicht** | Datenbank-Verwaltung, RLS-Debugging |
| **Postgres Meta** | ✅ RLS/Schema-Introspektion | ✅ **Pflicht** | Studio-Abhängigkeit |
| **Imgproxy** | — | ❌ **Entfernen** | Nur für Storage-Bildverarbeitung nötig |
| **Logflare** | — | ❌ **Entfernen** | Logging-Aggregation, nicht kritisch |
| **Analytics** | — | ❌ **Entfernen** | Supabase-Analytics, nicht genutzt |

### Minimale Service-Liste für ReinPlaner

```
✅ supabase-db           (PostgreSQL 15 + PostgREST)
✅ supabase-auth         (GoTrue Auth)
✅ supabase-realtime     (Phoenix/WebSocket Server)
✅ supabase-storage      (MinIO S3-kompatibel) — nur falls Storage benötigt
✅ supabase-kong         (API Gateway / Reverse Proxy)
✅ supabase-studio       (Web-basiertes Dashboard)
✅ supabase-postgres-meta (Schema-Introspection)
✅ supabase-vector       (pgvector für etwaige Embeddings) — optional
❌ logflare             (ENTFERNEN)
❌ imgproxy              (ENTFERNEN)
❌ analytics             (ENTFERNEN)
```

---

## 2. docker-compose.prod.yml

**Pfad:** `/home/ubuntu/ReinPlaner/docker-compose.prod.yml`

```yaml
# ==============================================
# ReinPlaner — Production Self-Hosted Supabase
# ==============================================
# Minimale Stack ohne Logflare, imgproxy, analytics
# 
# Start: docker compose -f docker-compose.prod.yml up -d
# Logs: docker compose -f docker-compose.prod.yml logs -f [service]

services:
  # ============================================
  # PostgreSQL Database + PostgREST
  # ============================================
  supabase-db:
    image: supabase/postgres:15.6.1.147
    container_name: supabase-db
    ports:
      - "5432:5432"  # Direkte DB-Verbindung (für Backups, pg_dump)
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - supabase_network
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 2G

  # ============================================
  # Postgres Meta (Schema Introspection für Studio)
  # ============================================
  supabase-meta:
    image: supabase/postgres-meta:v0.83.2
    container_name: supabase-meta
    ports:
      - "5431:5432"
    environment:
      PG_META_PORT: 5432
      PG_META_DB_HOST: supabase-db
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: postgres
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
      PG_META_CRYPTO_KEY: ${PG_META_CRYPTO_KEY}
    depends_on:
      supabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # PostgREST (Auto-REST-API)
  # ============================================
  postgrest:
    image: postgrest/postgrest:v12.0.2
    container_name: postgrest
    ports:
      - "3000:3000"  # Wird von Kong auf :8000暴露
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      PGRST_DB_SCHEMA: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_DB_EXTRA_SEARCH_PATH: public
    depends_on:
      supabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # GoTrue (Auth Server)
  # ============================================
  gotrue:
    image: supabase/gotrue:v2.158.1
    container_name: gotrue
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres?search_path=auth
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ALLOWED_URLS}
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: ${MAIL_AUTOCONFIRM}
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
      GOTRUE_RATE_LIMIT_HEADER: "X-RateLimit-Limit"
      GOTRUE_SECURE_EMAIL_CHANGE_ENABLED: "true"
      GOTRUE_HOOK_MFA_VERIFICATION_ATTEMPT_HOOK: ${GOTRUE_HOOK_MFA_ENABLED}
      GOTRUE_HOOK_MFA_VERIFICATION_ATTEMPT_METHODS: ""
    depends_on:
      supabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # Realtime (Phoenix Channels / WebSocket)
  # ============================================
  realtime:
    image: supabase/realtime:v2.30.23
    container_name: realtime
    ports:
      - "4000:4000"
    environment:
      DB_HOST: supabase-db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_AFTER_CONNECT: "SET search_path TO _realtime"
      DB_ENC_KEY: ${REALTIME_ENC_KEY}
      REALTIME_JWT_SECRET: ${REALTIME_JWT_SECRET}
      PORT: 4000
      SLOT_NAME: supabase_realtime_rls
      TEMPORARY_SLOT: "true"
      SECURE_CHANNELS: "true"
      SLOT_ISolation_OPT: "read_committed"
      MAX_REPLICATION_LAG_BEFORE_SEND: 15000
      MAX_WAL_CPU_TO_PAUSE: 10000
      MAX_WAL_LAG_TO_PAUSE: 10000000
      MAX_WAL_LAG_TO_PAUSE_MIN: 1000000
    depends_on:
      supabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bash", "-c", "printf '\\0' > /dev/tcp/localhost/4000"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network
    deploy:
      resources:
        limits:
          memory: 2G

  # ============================================
  # Storage (MinIO S3-kompatibel)
  # ============================================
  storage:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: storage
    ports:
      - "9000:9000"   # MinIO Console
      - "9001:9001"   # MinIO API
    environment:
      MINIO_ROOT_USER: ${S3_PROTOCOL_ACCESS_KEY_ID}
      MINIO_ROOT_PASSWORD: ${S3_PROTOCOL_ACCESS_KEY_SECRET}
    volumes:
      - supabase-storage-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # Storage API (S3-to-REST Interface)
  # ============================================
  storage-api:
    image: supabase/storage-api:v1.11.7
    container_name: storage-api
    ports:
      - "5000:5000"
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://postgrest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_EVENTS: "true"
      STORAGE_TYPE: s3
      S3_ENDPOINT: http://storage:9000
      AWS_ACCESS_KEY_ID: ${S3_PROTOCOL_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${S3_PROTOCOL_ACCESS_KEY_SECRET}
      AWS_REGION: eu-central-1
    volumes:
      - supabase-storage-data:/var/lib/storage
    depends_on:
      supabase-db:
        condition: service_healthy
      storage:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/status"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # Kong (API Gateway)
  # ============================================
  kong:
    image: kong:2.8.1
    container_name: kong
    ports:
      - "8000:8000"   # HTTP API
      - "8443:8443"   # HTTPS API
      - "8001:8001"   # Kong Admin API
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: supabase-db
      KONG_PG_PORT: 5432
      KONG_PG_USER: postgres
      KONG_PG_PASSWORD: ${POSTGRES_PASSWORD}
      KONG_PG_DB: kong
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,IP-restriction,rate-limiting
      KONG_LOG_LEVEL: notice
    volumes:
      - ./supabase/kong.prod.yml:/var/lib/kong/kong.yml:ro
    depends_on:
      supabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

  # ============================================
  # Supabase Studio (Dashboard)
  # ============================================
  studio:
    image: supabase/studio:20241028-91ff1ce
    container_name: studio
    ports:
      - "8000:3000"  # Über Kong exponiert, direkt: 3000
    environment:
      SUPABASE_URL: http://kong:8000
      STUDIO_PG_META_URL: http://supabase-meta:5432
      POSTGRES_USER: postgres
      POSTGRES_HOST: supabase-db
      POSTGRES_PORT: 5432
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      DASHBOARD_USERNAME: ${DASHBOARD_USERNAME}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
    depends_on:
      supabase-db:
        condition: service_healthy
      kong:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - supabase_network

# ==============================================
# Volumes (Persistent Storage)
# ==============================================
volumes:
  supabase-db-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/db-data
  supabase-storage-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/storage-data

networks:
  supabase_network:
    driver: bridge
```

### Kong production config (`/home/ubuntu/ReinPlaner/supabase/kong.prod.yml`)

```yaml
_format_version: "2.1"
_transform: true

services:
  # REST API (PostgREST)
  - name: postgrest
    url: http://postgrest:3000/
    routes:
      - name: postgrest-route
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          key_names:
            - apikey
          key_in_header: true
          key_in_query: false

  # Auth (GoTrue)
  - name: gotrue
    url: http://gotrue:9999/
    routes:
      - name: gotrue-route
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors

  # Storage API
  - name: storage-api
    url: http://storage-api:5000/
    routes:
      - name: storage-route
        strip_path: true
        paths:
          - /storage/v1/

  # Realtime
  - name: realtime
    url: http://realtime:4000/
    routes:
      - name: realtime-route
        strip_path: true
        paths:
          - /realtime/v1/

  # Studio
  - name: studio
    url: http://studio:3000/
    routes:
      - name: studio-route
        strip_path: false
        paths:
          - /

  # Edge Functions
  - name: functions
    url: http://functions:3001/
    routes:
      - name: functions-route
        strip_path: true
        paths:
          - /functions/v1/

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
        - X-Client-Info
        - X-Client-Version
        - X-Real-IP
        - X-Forwarded-For
        - X-Forwarded-Proto
        - X-Request-Id
        - apikey
      exposed_headers:
        - X-Total-Count
        - X-Page-Total
      credentials: true
      max_age: 3600
```

---

## 3. .env.prod.template

**Pfad:** `/home/ubuntu/ReinPlaner/.env.prod.template`

```bash
# ==============================================
# ReinPlaner — Supabase Self-Hosted Production
# ==============================================
# Kopieren zu: .env.prod
# Alle Werte MÜSSEN durch sichere Werte ersetzt werden!
# 
# Generierung von Secrets:
#   openssl rand -base64 32        (für JWT_SECRET, SECRET_KEY_BASE)
#   openssl rand -hex 32           (für Vault-Keys)
# ==============================================

# ============================================
# DOMAIN / URL KONFIGURATION
# ==============================================
SUPABASE_PUBLIC_URL=https://supabase.reinplaner.de
API_EXTERNAL_URL=https://supabase.reinplaner.de
SITE_URL=https://reinplaner.de
ALLOWED_URLS=https://reinplaner.de,https://*.reinplaner.de

# ============================================
# POSTGRES
# ==============================================
POSTGRES_PASSWORD=<SECURE_POSTGRES_PASSWORD>  # Min. 32 Zeichen, Buchstaben+Zahlen

# ============================================
# JWT (Auth + PostgREST)
# ==============================================
# Generieren: openssl rand -base64 32
JWT_SECRET=<YOUR_JWT_SECRET>

# ============================================
# ANON + SERVICE KEYS
# ==============================================
# Generieren: sh ./utils/generate-keys.sh (im supabase docker Verzeichnis)
# Oder manuell:openssl rand -base64 32
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1O7WVzU5y9_8x5dKfFRVoi5c4dVyinjxn6NF8YQ
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwq9y2K-MF9_NF8CqQCo4

# ============================================
# GOTRUE (AUTH) KONFIGURATION
# ==============================================
# MFA aktivieren (Email-Bestätigung stattdessen bei echten Emails)
GOTRUE_HOOK_MFA_ENABLED=false
MAIL_AUTOCONFIRM=true

# SMTP für echte Emails (z.B. SMTP von Mailgun/SendGrid/Postmark)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@reinplaner.de
SMTP_PASS=<SMTP_PASSWORD>
SMTP_ADMIN_EMAIL=noreply@reinplaner.de
SMTP_SENDER_NAME=ReinPlaner <noreply@reinplaner.de>

# ============================================
# REALTIME
# ==============================================
# Generieren: openssl rand -base64 48
REALTIME_ENC_KEY=<YOUR_REALTIME_ENC_KEY>
# Generieren: openssl rand -base64 32
REALTIME_JWT_SECRET=<YOUR_REALTIME_JWT_SECRET>

# ============================================
# STORAGE (MinIO)
# ==============================================
# Generieren: openssl rand -hex 16
S3_PROTOCOL_ACCESS_KEY_ID=<YOUR_S3_KEY_ID>
# Generieren: openssl rand -hex 32
S3_PROTOCOL_ACCESS_KEY_SECRET=<YOUR_S3_SECRET>

# ============================================
# POSTGRES META
# ==============================================
# Generieren: openssl rand -base64 24
PG_META_CRYPTO_KEY=<YOUR_PG_META_CRYPTO_KEY>

# ============================================
# SUPABASE STUDIO (Dashboard Login)
# ==============================================
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<SECURE_DASHBOARD_PASSWORD>  # Min. 1 Buchstabe, kein Special Char

# ============================================
# BACKUP KONFIGURATION
# ==============================================
BACKUP_ENABLED=true
BACKUP_CRON="0 2 * * *"  # Täglich 02:00 UTC
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=s3://reinplaner-backups/supabase/
BACKUP_S3_REGION=eu-central-1

# ============================================
# MONITORING
# ==============================================
# Prometheus metrics endpoint (optional)
METRICS_ENABLED=true
METRICS_PORT=9090

# ============================================
# LOGGING
# ==============================================
LOG_LEVEL=warn  # error, warn, info, debug
```

---

## 4. Backup-Strategie + Monitoring

### 4.1 Backup-Strategie

#### PostgreSQL Backups (Wichtigste!)

**Backup-Frequenz:**

| Backup-Typ | Frequenz | Retention | Ziel |
|---|---|---|---|
| Täglich (Full) | 02:00 UTC | 30 Tage | Lokal + S3 |
| Wöchentlich | Sonntag 03:00 | 12 Wochen | S3 |
| Monatlich | 1. des Monats | 12 Monate | S3 + extern |
| Point-in-Time | Kontinuierlich (WAL) | 7 Tage | Lokal |

**Backup-Script:** `/home/ubuntu/ReinPlaner/scripts/backup.sh`

```bash
#!/bin/bash
# ==============================================
# ReinPlaner — PostgreSQL Backup Script
# ==============================================
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/data/supabase/backups"
S3_BUCKET="${BACKUP_S3_BUCKET:-s3://reinplaner-backups/supabase}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# WAL Archiving aktivieren (continuous backup)
export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "[$(date)] Starting PostgreSQL backup..."

# ---- Full SQL Dump ----
pg_dump -h localhost -U postgres -Fc -f "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump" postgres

# ---- Verschlüsselung ----
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump" \
  -out "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump.enc" \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"

rm "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump"

# ---- S3 Upload ----
if command -v aws &> /dev/null; then
  aws s3 cp "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump.enc" \
    "${S3_BUCKET}/daily/pg_dump_${TIMESTAMP}.dump.enc"
  echo "[$(date)] Uploaded to S3"
fi

# ---- Alte Backups löschen ----
find "${BACKUP_DIR}" -name "pg_dump_*.dump.enc" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleanup complete (retention: ${RETENTION_DAYS} days)"

# ---- Health Check ----
if [ -f "${BACKUP_DIR}/pg_dump_${TIMESTAMP}.dump.enc" ]; then
  echo "[$(date)] Backup completed successfully: pg_dump_${TIMESTAMP}.dump.enc"
else
  echo "[$(date)] ERROR: Backup file not found!"
  exit 1
fi
```

**Restore-Script:** `/home/ubuntu/ReinPlaner/scripts/restore.sh`

```bash
#!/bin/bash
# ==============================================
# ReinPlaner — PostgreSQL Restore Script
# ==============================================
set -euo pipefail

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "[$(date)] Starting restore from: $BACKUP_FILE"

# ---- Entschlüsselung ----
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in "$BACKUP_FILE" \
  -out /tmp/pg_dump_restore.dump \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"

# ---- Restore ----
pg_restore -h localhost -U postgres -d postgres --clean --if-exists /tmp/pg_dump_restore.dump

rm /tmp/pg_dump_restore.dump
echo "[$(date)] Restore completed"
```

**Crontab-Eintrag:**

```bash
# /etc/crontab
0 2 * * * root /home/ubuntu/ReinPlaner/scripts/backup.sh >> /var/log/supabase_backup.log 2>&1
```

### 4.2 Monitoring

#### Prometheus + Grafana Stack

**docker-compose.monitoring.yml:**

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
    restart: unless-stopped
    networks:
      - supabase_network

  grafana:
    image: grafana/grafana:10.1.0
    container_name: grafana
    ports:
      - "3030:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - supabase_network

volumes:
  prometheus-data:
  grafana-data:

networks:
  supabase_network:
    external: true
```

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files: []

scrape_configs:
  # PostgreSQL Metrics (via postgres_exporter)
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Kong Metrics
  - job_name: 'kong'
    static_configs:
      - targets: ['kong:8001']

  # Docker Container Metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Node Exporter (Server Metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

#### Wichtige Metriken zu Überwachen

| Metrik | Alarm-Schwelle | Beschreibung |
|---|---|---|
| `pg_stat_database_tup_inserted` | > 10k/s | Ungewöhnlicher Write-Traffic |
| `pg_stat_database_numbackends` | > 80 | Connection-Nähe zum Limit |
| `pg_replication_lag` | > 10s | Replikationsverzögerung |
| `container_memory_usage_bytes` | > 85% RAM | Memory-Druck |
| `kong_latency_ms` | > 500ms p99 | API-Latenz |
| `realtime_client_connected` | > 5000 | Viele gleichzeitige WS |

#### Health Check Endpoints

```bash
# Strukturierte Health Checks
curl http://localhost:8000/rest/v1/?apikey=<ANON_KEY>  # PostgREST
curl http://localhost:9999/health                       # GoTrue
curl http://localhost:4000/health                       # Realtime
curl http://localhost:5000/status                       # Storage API
curl http://localhost:8000/                             # Kong
```

---

## 5. Update-Prozedur

### 5.1 Update-Strategie

Supabase veröffentlicht Releases ca. monatlich. Updates sollten **nicht** automatisch eingespielt werden — Always-Test first.

**Aktueller Stack (aus docker-compose.yml):**
```
supabase/postgres:     15.6.1.147
supabase/kong:         2.8.1
supabase/studio:       20241028-91ff1ce
postgrest/postgrest:   v12.0.2
supabase/gotrue:       v2.158.1
supabase/realtime:     v2.30.23
supabase/storage-api:  v1.11.7
minio/minio:           RELEASE.2024-01-16T16-07-38Z
kong:                  2.8.1
```

### 5.2 Update-Schritte

#### Vorbereitung

```bash
# 1. Backup VOR jedem Update
/home/ubuntu/ReinPlaner/scripts/backup.sh

# 2. Changelog prüfen
# https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md

# 3. Test-Environment updaten (nie direkt Production!)
```

#### Update-Prozedur (Production)

```bash
# ==============================================
# Production Update — Supabase Self-Hosted
# ==============================================

# 1. Server SSH + Verzeichnis
cd /home/ubuntu/ReinPlaner

# 2. Neues Image pullen (ohne Containers zu stoppen)
docker compose -f docker-compose.prod.yml pull

# 3. Backup verifizieren
ls -la /data/supabase/backups/

# 4. Maintenance-Mode aktivieren (in Kong)
# -> Healthchecks auf /maintenance umbiegen (optional)

# 5. Rolling Update (zero-downtime wenn alle health checks passen)
docker compose -f docker-compose.prod.yml up -d --no-deps

# 6. Services einzeln prüfen
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 supabase-db
docker compose -f docker-compose.prod.yml logs --tail=50 kong

# 7. Health Checks
curl -f http://localhost:8000/rest/v1/?apikey=<ANON_KEY> || exit 1
curl -f http://localhost:9999/health || exit 1
curl -f http://localhost:4000/health || exit 1

# 8. Applikations-Tests
echo "Test: Supabase Client Connection"
cd /home/ubuntu/ReinPlaner
npm run build 2>&1 | head -20 || echo "Build check"

# 9. Monitoring prüfen
# -> Grafana: http://localhost:3030
# -> Prometheus: http://localhost:9090
```

#### Rollback bei Problemen

```bash
# ==============================================
# Rollback auf vorherige Version
# ==============================================

# 1. Backup prüfen
ls -la /data/supabase/backups/

# 2. Container auf alte Images zurücksetzen
docker compose -f docker-compose.prod.yml down

# 3. Altes Image explizit setzen (in docker-compose.prod.yml)
# z.B. image: supabase/postgres:15.6.1.147

# 4. Neu starten
docker compose -f docker-compose.prod.yml up -d

# 5. Restore aus Backup falls nötig
# /home/ubuntu/ReinPlaner/scripts/restore.sh /data/supabase/backups/pg_dump_YYYYMMDD_HHMMSS.dump.enc
```

### 5.3 Image-Update-Frequenz

| Service | Update-Frequenz | Priorität |
|---|---|---|
| `supabase-db` (PostgreSQL) | Quartalsweise (minor), Yearly (major) | Kritisch |
| `supabase-kong` | Monatlich | Mittel |
| `supabase-studio` | Monatlich | Niedrig |
| `postgrest` | Quartalsweise | Mittel |
| `supabase-gotrue` | Quartalsweise | Hoch |
| `supabase-realtime` | Monatlich | Mittel |
| `supabase-storage-api` | Quartalsweise | Mittel |
| `minio` | Quartalsweise | Mittel |

**PostgreSQL Major-Updates (15 → 16 → 17):** Immer erst in Test-Umgebung validieren, dann mit 3-Tage-Warnung in Maintenance-Window.

### 5.4 Deprecations / Removals

Die aktuell entfernten Services (Logflare, imgproxy, analytics) werden **nicht** benötigt und sollten nicht installiert werden.

**Achtung:** Bei zukünftigen Supabase-Updates können sich Umgebungsvariablen ändern. Immer die Changelog prüfen.

---

## Anhang: Quick-Reference

### Wichtige Ports

| Port | Service | URL |
|---|---|---|
| 8000 | Kong HTTP API | `http://<server>:8000` |
| 5432 | PostgreSQL direkt | `postgres://postgres:<pw>@<server>:5432/postgres` |
| 9999 | GoTrue Auth | `http://<server>:9999` |
| 4000 | Realtime WS | `ws://<server>:4000` |
| 5000 | Storage API | `http://<server>:5000` |
| 8001 | Kong Admin | `http://<server>:8001` |
| 9000 | MinIO API | `http://<server>:9000` |
| 9001 | MinIO Console | `http://<server>:9001` |

### Nützliche Commands

```bash
# Logs eines Services
docker compose -f docker-compose.prod.yml logs -f supabase-db

# Alle Services neustarten
docker compose -f docker-compose.prod.yml restart

# In DB verbinden
psql 'postgres://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres'

# Images auflisten
docker images | grep supabase

# Storage Bucket erstellen (MinIO CLI)
mc alias set local http://localhost:9000 <KEY> <SECRET>
mc mb local/supabase-storage
mc anonymous set download local/supabase-storage

# Realtime Channels prüfen
curl -H "Authorization: Bearer <SERVICE_ROLE_KEY>" http://localhost:4000/api/tenants
```

### Support-Kontakte (falls benötigt)

- **GitHub Issues:** https://github.com/supabase/supabase/issues
- **Discord:** https://discord.supabase.com (Self-Hosted Channel)
- **Dokumentation:** https://supabase.com/docs/guides/self-hosting

---

*Letztes Update: 13. Mai 2026*
