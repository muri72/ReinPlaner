# Self-Hosted Supabase on Hetzner — Production Guide

**Datum:** 13. Mai 2026  
**Stack:** ReinPlaner (Next.js 16 + Supabase BaaS)  
**Ziel:** Vollständig selbst-gehostetes Supabase auf einem Hetzner Dedicated Server  
**Hardware:** Hetzner AX101/NJ1 (48 GB RAM, 32 vCPU, 2× 6 TB NVMe)

---

## Überblick

Dieses Dokument beschreibt die Produktions-Installation von Supabase auf einem eigenen Hetzner-Server. Alle Services werden über Docker Compose verwaltet und sind über einen Caddy-Reverse-Proxy nur intern erreichbar (keine direkten External Ports außer 443/80).

```
┌─────────────────────────────────────────────────────────────┐
│                     Hetzner Server                           │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │  Caddy       │    │  Supabase Stack (Docker Network) │  │
│  │  :443/:80    │───▶│  kong :54321 (intern)            │  │
│  │  (TLS + RP)  │    │  studio :3000  (intern)          │  │
│  └──────────────┘    │  postgres:5432  (intern)         │  │
│                      │  storage :5000  (intern)         │  │
│                      │  functions:9000 (intern)         │  │
│                      │  analytics :5437  (intern)       │  │
│                      │  postgrest  :54321 (intern)      │  │
│                      │  imgproxy   :5001  (intern)       │  │
│                      │  pgadmin   :5050  (intern)        │  │
│                      └──────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐                                           │
│  │  Backups     │  pg_dump + Volume Snapshots + Restic      │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. docker-compose.prod.yml

Diese Datei enthält den vollständigen Supabase-Stack mit allen offiziellen Images, Resource-Limits und Health-Checks.

```yaml
# ============================================================
# ReinPlaner — Self-Hosted Supabase Stack (Production)
# ============================================================
# Images: supabase/postgres:15.6.1.147  (LTS, PG 15.6)
#         supabase/kong:2.8.1
#         supabase/studio:20241028-91ff1ce
#         supabase/storage:20241028-91ff1ce
#         supabase/postgrest:20241028-91ff1ce
#         supabase/postgres-meta:20241028-91ff1ce
#         supabase/realtime:20241028-91ff1ce
#         supabase/edge-runtime:20241028-91ff1ce
#         supabase/imgproxy:20241028-91ff1ce
#         supabase/pgadmin:20241028-91ff1ce
#         supabase/postgres-backup:20241028-91ff1ce
#
# Ports (alle INTERNE Netzwerk-Nutzung, kein External):
#   - Kong:        54321  (API Gateway)
#   - Studio:      3000   (Supabase Dashboard UI)
#   - Postgres:    5432   (direkt nur für pg_dump/Admin)
#   - Storage:     5000   (S3-kompatibel)
#   - PostgREST:   54321  (REST API, hinter Kong)
#   - Meta:        54381  (DB Meta)
#   - Realtime:    54321  (WebSocket, hinter Kong)
#   - Functions:   9000   (Edge Functions)
#   - Analytics:   5437   (Postgres Analytics)
#   - Imgproxy:    5001   (Bild-Transformation)
#   - PgAdmin:     5050   (Optional, nur VPN/SSH-Tunnel)
#
# Run: docker-compose -f docker-compose.prod.yml up -d
# ============================================================

services:
  # ============================================================
  # 1. PostgreSQL 15.6 — Haupt-Datenbank
  # ============================================================
  postgres:
    image: supabase/postgres:15.6.1.147
    container_name: supabase_postgres
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"  # Nur lokaler Zugriff
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      POSTGRES_USER: supabase_admin
      POSTGRES_HOST: localhost
      # PGBooster / shared_buffers
      POSTGRES_SHARED_BUFFERS: 12GB
      POSTGRES_MAX_CONNECTIONS: 200
      POSTGRES_WORK_MEM: 16MB
      POSTGRES_MAINTENANCE_WORK_MEM: 2GB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 32GB
      POSTGRES_CONNTIMEOUT: 60s
      POSTGRES_STATS_COMMAND: "pg_stat_statements"
    volumes:
      - supabase_postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d:ro
      - ./supabase/seed-document-templates.ts:/docker-entrypoint-initdb.d/seed.sql:ro
      - /etc/localtime:/etc/localtime:ro
    shm_size: 2gb
    mem_limit: 16g
    cpu_shares: 1024
    cpus: 8.0
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supabase_admin -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    networks:
      - supabase_internal

  # ============================================================
  # 2. Kong — API Gateway
  # ============================================================
  kong:
    image: supabase/kong:2.8.1
    container_name: supabase_kong
    restart: unless-stopped
    ports:
      - "127.0.0.1:54321:54321"  # API Port (intern)
      - "127.0.0.1:8001:8001"    # Kong Admin API (intern)
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_PG_PORT: 5432
      KONG_PG_USER: supabase_admin
      KONG_PG_PASSWORD: ${POSTGRES_PASSWORD}
      KONG_PG_DB: kong
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth,jwt,hmac-auth
      KONG_LOG_LEVEL: notice
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_GUI_AUTHORitative_URI: ${SUPABASE_STUDIO_URL}
      # JWT Settings
      KONG_JWT_SECRET_NAME: ${JWT_SECRET}
      # Rate Limiting
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth,jwt,hmac-auth,rate-limiting
    volumes:
      - ./supabase/kong.prod.yml:/var/lib/kong/kong.yml:ro
    mem_limit: 1g
    cpu_shares: 256
    cpus: 1.0
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "kong health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    networks:
      - supabase_internal

  # ============================================================
  # 3. PostgREST — REST API Engine
  # ============================================================
  postgrest:
    image: supabase/postgrest:20241028-91ff1ce
    container_name: supabase_postgrest
    restart: unless-stopped
    ports:
      - "127.0.0.1:54321:3000"  # Intern, Kong forwarded
    environment:
      PGRST_DB_URI: postgres://supabase_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PGRST_DB_SCHEMA: public,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_DB_SETTINGS: app.settings
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_DB_EXTRA_SEARCH_PATH: public,extensions
      PGRST_APP_SETTINGS_MULTI_SCHEMA: "true"
      # Logging
      QUERY_LOG: "true"
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 1g
    cpu_shares: 256
    cpus: 1.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - supabase_internal

  # ============================================================
  # 4. Supabase Studio — Web UI Dashboard
  # ============================================================
  studio:
    image: supabase/studio:20241028-91ff1ce
    container_name: supabase_studio
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"  # Intern, Caddy forwarded
    environment:
      STUDIO_PG_META_URL: http://meta:54381
      POSTGRES_USER: supabase_admin
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DATABASE: postgres
      SUPABASE_URL: http://kong:54321
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_STUDIO_PORT: 3000
      # SMTP für Email-Versand im Studio
      SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      kong:
        condition: service_healthy
      meta:
        condition: service_healthy
    mem_limit: 2g
    cpu_shares: 256
    cpus: 1.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - supabase_internal

  # ============================================================
  # 5. Postgres Meta — Database Metadata API
  # ============================================================
  meta:
    image: supabase/postgres-meta:20241028-91ff1ce
    container_name: supabase_meta
    restart: unless-stopped
    ports:
      - "127.0.0.1:54381:54381"  # Intern
    environment:
      PG_META_PORT: 54381
      PG_META_DB_HOST: postgres
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
      PG_META_DB_SSL_MODE: disable
      # Auth
      PG_META_DB_AUTH_METHOD: password
      PG_META_JWT_SECRET: ${JWT_SECRET}
      PG_META_ADMIN_TOKEN: ${META_ADMIN_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 512m
    cpu_shares: 128
    cpus: 0.5
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:54381/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - supabase_internal

  # ============================================================
  # 6. Realtime — WebSocket Server
  # ============================================================
  realtime:
    image: supabase/realtime:20241028-91ff1ce
    container_name: supabase_realtime
    restart: unless-stopped
    ports:
      - "127.0.0.1:54321:3500"  # Intern, Kong forwarded
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_SSL: "false"
      PORT: 3500
      JWT_SECRET: ${JWT_SECRET}
      # Replizierung
      DB_AFTER_CONNECT_QUERY: "LISTEN pg_notify"
      DB_ENCODING: UTF8
      SLOT_NAME: supabase_realtime_rls
      TEMPORARY_SLOT: "true"
      # Pool
      DB_POOL: "5"
      MAX_HEADERS: 200
      MAX_CONNECTIONS: 10000
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 2g
    cpu_shares: 512
    cpus: 2.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3500/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - supabase_internal

  # ============================================================
  # 7. Storage — S3-kompatibler Object Storage
  # ============================================================
  storage:
    image: supabase/storage:20241028-91ff1ce
    container_name: supabase_storage
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"  # Intern, Kong forwarded
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://postgrest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      # S3-kompatibel (optional für Hetzner Object Storage)
      # S3_ENDPOINT: https://os-s3.hetzner.com
      # S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      # S3_SECRET_KEY: ${S3_SECRET_KEY}
      # S3_BUCKET: ${S3_BUCKET}
    volumes:
      - supabase_storage_data:/var/lib/storage
      - /var/run/docker.sock:/var/run/docker.sock:ro  # für Thumbnail-Generation
    depends_on:
      postgres:
        condition: service_healthy
      postgrest:
        condition: service_healthy
    mem_limit: 2g
    cpu_shares: 512
    cpus: 2.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5000/status || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 15s
    networks:
      - supabase_internal

  # ============================================================
  # 8. Edge Functions — Deno Runtime
  # ============================================================
  functions:
    image: supabase/edge-runtime:20241028-91ff1ce
    container_name: supabase_functions
    restart: unless-stopped
    ports:
      - "127.0.0.1:9000:9000"  # Intern, Kong forwarded
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: http://kong:54321
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgres://supabase_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      VERIFY_JWT: "true"
      # Analytics
      ANALYTICS_ENDPOINT: http://analytics:5437
    volumes:
      - ./supabase/functions:/home/deno/functions:ro
      - supabase_functions_data:/tmp/functions
    depends_on:
      postgres:
        condition: service_healthy
      analytics:
        condition: service_healthy
    mem_limit: 4g
    cpu_shares: 512
    cpus: 2.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:9000/status || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 15s
    networks:
      - supabase_internal

  # ============================================================
  # 9. Analytics — PostgreSQL Analytics (Clickhouse-style)
  # ============================================================
  analytics:
    image: supabase/postgres-analytics:20241028-91ff1ce
    container_name: supabase_analytics
    restart: unless-stopped
    ports:
      - "127.0.0.1:5437:5437"  # Intern
    environment:
      ANALYTICS_DATABASE_URL: postgres://supabase_admin:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PG_META_PORT: 54381
      FLUSH_INTERVAL: 5000
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 4g
    cpu_shares: 512
    cpus: 2.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5437/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - supabase_internal

  # ============================================================
  # 10. Image Proxy — Bild-Transformation
  # ============================================================
  imgproxy:
    image: supabase/imgproxy:20241028-91ff1ce
    container_name: supabase_imgproxy
    restart: unless-stopped
    ports:
      - "127.0.0.1:5001:5001"  # Intern
    environment:
      IMGPROXY_PORT: 5001
      IMGPROXY_LOG_LEVEL: info
      IMGPROXY_MAX_SRC_IDLE_TIME: 120s
      IMGPROXY_CACHE: "true"
      IMGPROXY_CACHE_DIR: /var/cache/imgproxy
      IMGPROXY_ENABLE_WEBP_DETECTION: "true"
      IMGPROXY_ENABLE_AVIF: "true"
      # Security
      IMGPROXY_ALLOW_ORIGIN: "*"
      IMGPROXY_ENFORCE_AVIF: "false"
      IMGPROXY_USE_GCS: "false"
    volumes:
      - supabase_imgproxy_cache:/var/cache/imgproxy
    depends_on:
      storage:
        condition: service_healthy
    mem_limit: 1g
    cpu_shares: 256
    cpus: 1.0
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5001/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - supabase_internal

  # ============================================================
  # 11. Postgres Backup — Automatische Backups via pgBackRest
  # ============================================================
  backup:
    image: supabase/postgres-backup:20241028-91ff1ce
    container_name: supabase_backup
    restart: unless-stopped
    ports:
      - "127.0.0.1:54320:5432"  # Backup-Port (readonly)
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      POSTGRES_USER: supabase_admin
      BACKUP_MODE: pgbackrest
      PGBACKREST_STANZA: db
      PGBACKREST_REPO_TYPE: local
      PGBACKREST_REPO_PATH: /var/lib/pgbackrest
      PGBACKREST_DB_HOST: postgres
      PGBACKREST_DB_PORT: 5432
      PGBACKREST_LOG_PATH: /var/log/pgbackrest
      BACKUP_HOUR: ${BACKUP_HOUR:-02}
      BACKUP_MINUTE: ${BACKUP_MINUTE:-00}
      # Retention
      PGBACKREST_RETENTION_FULL_TYPE: count
      PGBACKREST_RETENTION_FULL: 7
      PGBACKREST_RETENTION_DIFF: 6
    volumes:
      - supabase_backup_repo:/var/lib/pgbackrest
      - supabase_backup_logs:/var/log/pgbackrest
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 512m
    cpu_shares: 128
    cpus: 0.5
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supabase_admin -d postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - supabase_internal

  # ============================================================
  # 12. PgAdmin4 — Optional: PostgreSQL Admin UI (nur SSH-Tunnel)
  # ============================================================
  pgadmin:
    image: dpage/pgadmin4:8.10
    container_name: supabase_pgadmin
    restart: unless-stopped
    ports:
      - "127.0.0.1:5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@reinplaner.local}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: "False"
      PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: "False"
      PGADMIN_CONFIG_CONSOLE_LOG_LEVEL: 20
    volumes:
      - supabase_pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    mem_limit: 1g
    cpu_shares: 128
    cpus: 0.5
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:80/misc/ping || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - supabase_internal

# ============================================================
# Volumes — Persistente Daten
# ============================================================
volumes:
  supabase_postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/postgres
  supabase_storage_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/storage
  supabase_functions_data:
    driver: local
  supabase_imgproxy_cache:
    driver: local
  supabase_backup_repo:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/backups/pgbackrest
  supabase_backup_logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/backups/logs
  supabase_pgadmin_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/supabase/pgadmin

# ============================================================
# Netzwerk — Internes Docker-Netzwerk
# ============================================================
networks:
  supabase_internal:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
```

### Wichtige Hinweise zum docker-compose.prod.yml

- **Kein Service ist extern erreichbar** — alle Ports sind an `127.0.0.1` gebunden
- **Kong läuft auf Port 54321** (API) und Port 8001 (Admin) — nur intern
- **Studio läuft auf Port 3000** — Caddy forwarded von der externen Domain
- **Volume-Mounts** für Postgres, Storage, Backup sind auf dedizierte `/data`-Verzeichnisse gebunden

---

## 2. .env.prod.template

Kopieren Sie diese Datei nach `.env.prod` und füllen Sie alle Werte aus.

```bash
# ============================================================
# ReinPlaner — Supabase Self-Hosted Production Environment
# ============================================================
# Füllen Sie alle Werte aus und speichern Sie als .env.prod
# NIE in die Versionskontrolle einchecken!
#
# Generierung von sicheren Secrets:
#   openssl rand -base64 32
# ============================================================

# ============================================================
# 1. PostgreSQL Authentication
# ============================================================
# Master-Passwort für die Supabase-Datenbank
# Generieren: openssl rand -base64 32
POSTGRES_PASSWORD=CHANGE_ME_to_a_very_long_random_string

# ============================================================
# 2. JWT Configuration
# ============================================================
# JWT Secret für API-Authentifizierung (min. 32 Zeichen)
# Generieren: openssl rand -base64 32
JWT_SECRET=CHANGE_ME_to_a_very_long_random_string_like_this

# Anon Key — öffentlich, für Client-seitige Requests
# Generieren: supabase gen keys anon-key
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...CHANGE_ME

# Service Role Key — NUR für serverseitige Admin-Operationen
# Generieren: supabase gen keys service-role-key
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...CHANGE_ME

# Postgres Meta Admin Token (für API-Zugriff auf Meta)
META_ADMIN_TOKEN=CHANGE_ME_to_a_random_string

# ============================================================
# 3. Supabase URL (intern)
# ============================================================
SUPABASE_URL=http://localhost:54321
SUPABASE_STUDIO_URL=http://localhost:3000

# ============================================================
# 4. SMTP Configuration (für Email-Versand)
# ============================================================
# Beispiel: Resend (https://resend.com)
SMTP_ADMIN_EMAIL=admin@reinplaner.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_CHANGE_ME

# Alternative: Hetzner Mail (MX)
# SMTP_HOST=mx1.your-server.de
# SMTP_PORT=25
# SMTP_USER=your_username
# SMTP_PASS=your_password

# ============================================================
# 5. Backup Configuration
# ============================================================
# Wann soll das tägliche Backup laufen? (UTC)
BACKUP_HOUR=02
BACKUP_MINUTE=00

# Backup-Ziel (lokal + Remote)
BACKUP_DESTINATION_LOCAL=/data/supabase/backups/daily
BACKUP_RETENTION_DAYS=14

# Optional: Restic Remote Backup (S3-kompatibel)
# RESTIC_REPOSITORY=s3:https://os-s3.hetzner.com/your-bucket/backups
# RESTIC_PASSWORD=CHANGE_ME_to_restic_password

# ============================================================
# 6. Storage (optional: Hetzner Object Storage)
# ============================================================
# S3_ENDPOINT=https://os-s3.hetzner.com
# S3_ACCESS_KEY=your_hetzner_object_storage_key
# S3_SECRET_KEY=your_hetzner_object_storage_secret
# S3_BUCKET=reinplaner-storage

# ============================================================
# 7. PgAdmin (optional)
# ============================================================
PGADMIN_EMAIL=admin@reinplaner.local
PGADMIN_PASSWORD=CHANGE_ME_to_strong_pgadmin_password

# ============================================================
# 8. CORS (nur falls extern notwendig)
# ============================================================
CORS_ORIGIN=https://reinplaner.com

# ============================================================
# 9. Logging & Monitoring
# ============================================================
LOG_LEVEL=notice
LOG_DESTINATION=stdout
```

---

## 3. Kong Production Config (kong.prod.yml)

Erstellen Sie `supabase/kong.prod.yml`:

```yaml
_format_version: "2.1"
_transform: true

# ============================================================
# Kong Configuration für Production
# ============================================================

services:
  # ---- PostgREST (REST API) ----
  - name: postgrest
    url: http://postgrest:3000/
    routes:
      - name: postgrest-route
        service: postgrest
        strip_path: true
        preserve_host: false
        paths:
          - /rest/v1/
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
            - Prefer
            - apikey
            - x-client-info
            - x-requested-with
          exposed_headers:
            - Content-Range
            - X-Total-Count
          credentials: true
          max_age: 3600
      - name: key-auth
        config:
          key_names:
            - apikey
            - authorization
          key_in_header: true
          key_in_query: false
          hide_credentials: true

  # ---- Auth (GoTrue-kompatibel) ----
  - name: auth
    url: http://kong:54321/auth/v1/
    routes:
      - name: auth-route
        service: auth
        strip_path: true
        preserve_host: false
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: request-transformer
        config:
          add:
            headers:
              - "X-Client-Name: ReinPlaner"

  # ---- Realtime (WebSocket) ----
  - name: realtime
    url: http://realtime:3500/
    routes:
      - name: realtime-route
        service: realtime
        strip_path: false
        preserve_host: false
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: rate-limiting
        config:
          minute: 1000
          policy: local

  # ---- Storage ----
  - name: storage
    url: http://storage:5000/
    routes:
      - name: storage-route
        service: storage
        strip_path: true
        preserve_host: false
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  # ---- Edge Functions ----
  - name: functions
    url: http://functions:9000/
    routes:
      - name: functions-route
        service: functions
        strip_path: true
        preserve_host: false
        paths:
          - /functions/v1/
    plugins:
      - name: cors

  # ---- Analytics ----
  - name: analytics
    url: http://analytics:5437/
    routes:
      - name: analytics-route
        service: analytics
        strip_path: true
        preserve_host: false
        paths:
          - /analytics/v1/

# ============================================================
# Global Plugins
# ============================================================
plugins:
  - name: acl
    config:
      allow: []
      hide_groups_header: true
  - name: request-transformer
    config:
      add:
        headers:
          - "X-Kong-Upstream: Supabase"
```

---

## 4. Resource Estimates für 48 GB RAM / 32 vCPU Hetzner Server

### Server-Spezifikationen

| Resource | Verfügbar | Beschreibung |
|---|---|---|
| RAM | 48 GB | Hetzner AX101 / NJ1 |
| CPU | 32 vCPU | AMD EPYC / Intel Xeon |
| NVMe | 2× 6 TB | Hetzner (als `/data`) |

### RAM-Verteilung pro Service

| Service | RAM | CPU (vCPU) | Anmerkung |
|---|---|---|---|
| **postgres** | 16 GB | 8 | shared_buffers=12GB, für RLS-heavy Workload |
| **studio** | 2 GB | 1 | React App, leicht |
| **kong** | 1 GB | 1 | API Gateway |
| **postgrest** | 1 GB | 1 | REST API |
| **meta** | 512 MB | 0.5 | DB Meta API |
| **realtime** | 2 GB | 2 | WebSocket-Server |
| **storage** | 2 GB | 2 | File Storage + Thumbnails |
| **functions** | 4 GB | 2 | Deno Edge Runtime |
| **analytics** | 4 GB | 2 | Clickhouse-style queries |
| **imgproxy** | 1 GB | 1 | Bild-Transformation |
| **backup** | 512 MB | 0.5 | pgBackRest |
| **pgadmin** | 1 GB | 0.5 | Optional |
| **System (OS + Docker)** | ~12 GB | 10 | Kernel, Docker Daemon, Logs |
| **Headroom** | ~1 GB | 1 | Puffer, OOM-Schutz |
| **Summe** | **~47 GB** | **~22** | 32 vCPU ausreichend |

### CPU-Auslastung (Peak vs. Idle)

```
Peak-Szenario (alle Services aktiv):
  - Postgres:    8 vCPU × 80% = 6.4 cores
  - Realtime:   2 vCPU × 50% = 1.0 core
  - Functions:  2 vCPU × 60% = 1.2 cores
  - Storage:     2 vCPU × 40% = 0.8 core
  - Kong:        1 vCPU × 30% = 0.3 core
  - Andere:      ~3 vCPU × 20% = 0.6 core
  ─────────────────────────────────────
  Gesamt:                          ~10.3 cores (von 32 verfügbar)

Idle-Szenario (nur Postgres + Kong):
  - Postgres:   8 vCPU × 5% = 0.4 core
  - Kong:       1 vCPU × 2% = 0.02 core
  ─────────────────────────────────────
  Gesamt:                          ~0.5 cores
```

### Disk I/O

| Volume | Größe | Typ | Anmerkung |
|---|---|---|---|
| `/data/supabase/postgres` | ~100 GB (Wachstum) | NVMe | Schnellste writes |
| `/data/supabase/storage` | ~500 GB | NVMe | Dateien, Thumbnails |
| `/data/supabase/backups` | ~200 GB | NVMe | tägliche Snapshots |

---

## 5. Backup Strategy

### 5.1 PostgreSQL Backup (pgBackRest)

```bash
# Verzeichnis erstellen
mkdir -p /data/supabase/backups/{pgbackrest,logs,daily}

# Tägliches Backup via pgBackRest (im backup-Container)
# Läuft automatisch um 02:00 UTC

# Manuelle Wiederherstellung:
#   pgbackrest restore --stanza=db --type=time --target="2026-05-13 02:30:00"
```

### 5.2 Automatisiertes Backup Script

Erstellen Sie `/opt/reinplaner/backup.sh`:

```bash
#!/bin/bash
# ============================================================
# ReinPlaner — Supabase Backup Script
# ============================================================
# Führt pg_dump + Volume-Snapshot + Restic durch
# Schedule: crontab -e -> 0 3 * * * /opt/reinplaner/backup.sh
# ============================================================

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/data/supabase/backups/daily"
RETENTION_DAYS=14
LOGFILE="/var/log/reinplaner-backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

log "=== Backup gestartet ==="

# 1. PostgreSQL pg_dump (SQL Dump für schnelle Wiederherstellung)
log "1. Erstelle PostgreSQL pg_dump..."
docker exec supabase_postgres pg_dump -U supabase_admin postgres \
    | gzip > "${BACKUP_DIR}/reinplaner_${TIMESTAMP}.sql.gz"
log "   pg_dump erstellt: reinplaner_${TIMESTAMP}.sql.gz"

# 2. Volume-Snapshot (BTRFS/ZFS) falls möglich
if command -v btrfs &> /dev/null; then
    log "2. Erstelle BTRFS Snapshot..."
    btrfs subvolume snapshot /data/supabase/postgres /data/supabase/backups/snapshots/postgres_${TIMESTAMP}
    log "   BTRFS Snapshot erstellt"
fi

# 3. Alte Backups aufräumen
log "3. Alte Backups aufräumen (Retention: ${RETENTION_DAYS} Tage)..."
find "$BACKUP_DIR" -name "reinplaner_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.snap" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# 4. Optional: Restic Remote Backup (Hetzner Object Storage)
if [ -n "${RESTIC_REPOSITORY:-}" ]; then
    log "4. Sync zu Restic Remote..."
    restic --password-file /etc/restic/password backup "$BACKUP_DIR" \
        --repo "$RESTIC_REPOSITORY" \
        --tag "reinplaner" \
        --tag "date=$(date +%Y-%m-%d)"
    log "   Restic Backup abgeschlossen"
fi

log "=== Backup abgeschlossen ==="
du -sh "$BACKUP_DIR"/*_${TIMESTAMP}* 2>/dev/null || true
```

### 5.3 Cronjob einrichten

```bash
# crontab -e
0 3 * * * /opt/reinplaner/backup.sh >> /var/log/reinplaner-backup-cron.log 2>&1
```

### 5.4 Backup-Ziele Übersicht

| Ziel | Typ | Retention | Anmerkung |
|---|---|---|---|
| Lokal NVMe | `/data/supabase/backups/daily/` | 14 Tage | Schnellste Wiederherstellung |
| BTRFS Snapshot | `/data/supabase/backups/snapshots/` | 7 Tage | Point-in-time |
| Hetzner Object Storage | S3 (Optional) | 30 Tage | Remote/DR |

---

## 6. Health Check Design

### 6.1 Health Check Endpoints

Jeder Service exponiert einen Health-Check-Endpoint:

| Service | Endpoint | Erwartete Antwort |
|---|---|---|
| Kong | `http://localhost:54321/` | HTTP 200 mit `{"kong":true}` |
| Studio | `http://localhost:3000/api/health` | HTTP 200 |
| Postgres | `pg_isready -U supabase_admin` | Exit 0 |
| PostgREST | `http://localhost:3000/` | HTTP 200 |
| Meta | `http://localhost:54381/health` | HTTP 200 |
| Realtime | `http://localhost:3500/api/health` | HTTP 200 |
| Storage | `http://localhost:5000/status` | HTTP 200 |
| Functions | `http://localhost:9000/status` | HTTP 200 |
| Analytics | `http://localhost:5437/health` | HTTP 200 |
| Imgproxy | `http://localhost:5001/health` | HTTP 200 |
| Backup | `pg_isready -U supabase_admin` | Exit 0 |

### 6.2 Zentraler Health Check (Caddy → Kong → Services)

Caddy forwarded `/healthz` an Kong:

```
Client → Caddy (GET /healthz) 
       → Kong (GET /healthz) 
       → PostgREST (GET /) 
       → Postgres (pg_isready)
```

### 6.3 Health Check Script für Monitoring

Erstellen Sie `/opt/reinplaner/healthcheck.sh`:

```bash
#!/bin/bash
# ============================================================
# ReinPlaner — Supabase Health Check Script
# ============================================================
# Verwendet für: Docker HEALTHCHECK, Cron-Monitoring, etc.
# Exit 0 = gesund, Exit 1 = Probleme
# ============================================================

set -euo pipefail

KONG_URL="${SUPABASE_URL:-http://localhost:54321}"
TIMEOUT=5

check_service() {
    local name=$1
    local url=$2
    
    if curl -sf --max-time "$TIMEOUT" "$url" > /dev/null 2>&1; then
        echo "[OK]   $name"
        return 0
    else
        echo "[FAIL] $name — $url"
        return 1
    fi
}

echo "=== ReinPlaner Supabase Health Check ==="
echo "Zeit: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

FAILED=0

# 1. Kong Gateway (API)
check_service "Kong Gateway" "$KONG_URL/" || ((FAILED++))

# 2. Supabase Studio
check_service "Studio" "http://localhost:3000/api/health" || ((FAILED++))

# 3. Postgres
if docker exec supabase_postgres pg_isready -U supabase_admin -d postgres > /dev/null 2>&1; then
    echo "[OK]   Postgres"
else
    echo "[FAIL] Postgres"
    ((FAILED++))
fi

# 4. PostgREST
check_service "PostgREST" "http://localhost:54321/rest/v1/" || ((FAILED++))

# 5. Storage
check_service "Storage" "http://localhost:5000/status" || ((FAILED++))

# 6. Realtime
check_service "Realtime" "http://localhost:54321/realtime/v1/" || ((FAILED++))

# 7. Edge Functions
check_service "Functions" "http://localhost:9000/status" || ((FAILED++))

# 8. Analytics
check_service "Analytics" "http://localhost:5437/health" || ((FAILED++))

# 9. Meta
check_service "Meta" "http://localhost:54381/health" || ((FAILED++))

echo ""
echo "========================================"
if [ $FAILED -eq 0 ]; then
    echo "Status: HEALTHY (alle Services OK)"
    exit 0
else
    echo "Status: DEGRADED ($FAILED Service(s) ausgefallen)"
    exit 1
fi
```

### 6.4 Docker HEALTHCHECK Integration

In `docker-compose.prod.yml` sind alle Health-Checks bereits definiert:

```yaml
healthcheck:
  test: ["CMD-SHELL", "/opt/reinplaner/healthcheck.sh"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## 7. Caddy Reverse Proxy Configuration

### 7.1 Caddyfile für Supabase (intern)

Caddy ist der einzige extern erreichbare Service. Er leitet alle Anfragen an die internen Supabase-Services weiter.

```bash
# /etc/caddy/Caddyfile
# oder im Caddy-Container: /etc/caddy/Caddyfile

# ============================================================
# ReinPlaner — Caddy Reverse Proxy für Supabase
# ============================================================

# Globale Einstellungen
{
    # Admin Interface (nur intern)
    admin off
    
    # TLS wird von Caddy automatisch verwaltet
    # Für Hetzner: Let's Encrypt ist ausreichend
    
    # Logging
    log {
        level INFO
        output file /var/log/caddy/access.log {
            roll true
            roll_size 100MB
            roll_keep 10
        }
    }
    
    # Performance
    max_header_size 32768
}

# ============================================================
# Supabase API Gateway (Kong)
# ============================================================
api.reinplaner.com {
    reverse_proxy localhost:54321 {
        health_uri /healthz
        health_interval 10s
        health_timeout 5s
        fail_duration 30s
    }
    
    # Headers für Supabase
    header -X-Kong-Upstream * {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    # CORS wird von Kong behandelt
}

# ============================================================
# Supabase Studio (Web UI)
# ============================================================
studio.reinplaner.com {
    reverse_proxy localhost:3000 {
        health_uri /api/health
        health_interval 10s
        health_timeout 5s
    }
    
    header -X-Frame-Options "SAMEORIGIN" {
        -X-Frame-Options
    }
}

# ============================================================
# Optional: Separate Storage Domain
# ============================================================
# storage.reinplaner.com {
#     reverse_proxy localhost:5000 {
#         health_uri /status
#     }
# }

# ============================================================
# Health Check (kein TLS nötig für Load Balancer)
# ============================================================
health.reinplaner.com {
    respond /healthz 200 {
        content_type text/plain
        body "OK"
    }
}

# ============================================================
# Fallback (alle anderen Subdomains)
# ============================================================
*.reinplaner.com {
    reverse_proxy localhost:54321
    
    # Wildcard TLS für alle Subdomains
    tls {
        alias *.reinplaner.com
    }
}
```

### 7.2 Caddy Docker Compose (falls als Container)

```yaml
# Ergänzung zu docker-compose.prod.yml
  caddy:
    image: caddy:2.8-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - /data/caddy/data:/data
      - /data/caddy/config:/config
      - /var/log/caddy:/var/log/caddy
    environment:
      - TZ=Europe/Berlin
    networks:
      - supabase_internal
    depends_on:
      - kong
      - studio
    mem_limit: 256m
    cpu_shares: 64
    cpus: 0.5
```

### 7.3 Caddy automatisches TLS

Caddy verwendet Let's Encrypt automatisch. Für Hetzner-Server mit dynamischer IP:

```bash
# DNS Challenge für wildcard TLS (empfohlen)
*.reinplaner.com {
    tls {
        dns hetzner {env.HETZNER_API_TOKEN}
    }
    reverse_proxy localhost:54321
}
```

---

## 8. Installations-Anleitung (Step-by-Step)

### 8.1 Server Vorbereitung

```bash
# 1. System aktualisieren
apt update && apt upgrade -y

# 2. Docker + Docker Compose installieren
apt install -y docker.io docker-compose

# 3. Verzeichnisse erstellen
mkdir -p /data/supabase/{postgres,storage,backups/{pgbackrest,logs,daily},pgadmin}
mkdir -p /opt/reinplaner
mkdir -p /var/log/caddy

# 4. Firewall konfigurieren (nur SSH + HTTP/HTTPS)
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# 5. BTRFS für effiziente Snapshots (optional)
# mkfs.btrfs /dev/nvme0n1p1
# mount /dev/nvme0n1p1 /data
```

### 8.2 Projekt-Dateien kopieren

```bash
# Projekt-Dateien auf Server übertragen
scp -r ReinPlaner/* user@hetzner:/opt/reinplaner/

# Wichtige Dateien:
# - docker-compose.prod.yml
# - supabase/kong.prod.yml
# - supabase/migrations/
# - .env.prod
```

### 8.3 Erster Start

```bash
cd /opt/reinplaner

# Environment-Variablen laden
set -a && source .env.prod && set +a

# Docker Volumes initialisieren
docker volume create --driver local \
    --opt type=none --opt o=bind \
    --opt device=/data/supabase/postgres \
    supabase_postgres_data

# Supabase Stack starten
docker-compose -f docker-compose.prod.yml up -d

# Logs beobachten
docker-compose -f docker-compose.prod.yml logs -f

# Health Check
/opt/reinplaner/healthcheck.sh
```

### 8.4 DNS konfigurieren

```
A Record    api.reinplaner.com      → SERVER_IP
A Record    studio.reinplaner.com    → SERVER_IP
A Record    *.reinplaner.com         → SERVER_IP
CNAME       *.reinplaner.com         → reinplaner.com (optional)
```

---

## 9. Monitoring & Alerts

### 9.1 Basis-Monitoring mit dem Health Check Script

```bash
# Cron: alle 5 Minuten
*/5 * * * * /opt/reinplaner/healthcheck.sh || \
    echo "ALERT: Supabase Health Check failed" | \
    mail -s "[ReinPlaner] SUPABASE DOWN" admin@reinplaner.com
```

### 9.2 Docker Stats Monitoring

```bash
# Docker Container Resource-Monitoring
watch -n5 'docker stats --no-stream \
    --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"'
```

---

## 10. Wartung

### 10.1 Logs Rotieren

```bash
# /etc/logrotate.d/reinplaner
/data/supabase/backups/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}

/var/log/caddy/*.log {
    daily
    rotate 10
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
}
```

### 10.2 Postgres Vaccum & Analyze

```bash
# Wöchentlich via Cron
0 4 * * 0 docker exec supabase_postgres psql -U supabase_admin -d postgres -c "VACUUM (VERBOSE, ANALYZE);"
```

---

## 11. Troubleshooting

### Häufige Probleme

**Problem:** Kong startet nicht
```bash
# Prüfe Kong-Logs
docker logs supabase_kong

# Verifiziere kong.prod.yml Syntax
docker exec supabase_kong kong config parse /var/lib/kong/kong.yml
```

**Problem:** Postgres startet nicht (Volume-Permission)
```bash
# Ownership korrigieren
chown -R 70:70 /data/supabase/postgres
chmod -R 700 /data/supabase/postgres
```

**Problem:** Studio lädt nicht
```bash
# Prüfe Meta-Service
docker logs supabase_meta
curl http://localhost:54381/health
```

---

## Anhang: Image Tags (Pinned Versions)

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
| caddy | caddy | 2.8-alpine |
