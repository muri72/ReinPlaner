# ReinPlaner Self-Hosting — Komplett-Setup

**Datum:** 13. Mai 2026  
**Zielgruppe:** Murat (Entwickler)  
**Zweck:** Lesbare Kurzversion des Self-Hosting Setups

---

## 1. Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    REINPLANER ARCHITEKTUR                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌─────────────────────────────────┐ │
│   │   BROWSER    │         │         COOLIFY SERVER          │ │
│   │  (Murat/     │────────▶│  ┌─────────────────────────────┐  │ │
│   │   Mitarbeiter)         │  │    Next.js App (Docker)    │  │ │
│   └──────────────┘         │  │   ┌─────────────────────┐   │  │ │
│                            │  │   │  Port 3000 (HTTPS)  │   │  │ │
│                            │  │   └─────────────────────┘   │  │ │
│                            │  └─────────────────────────────┘  │ │
│                            │              │                     │ │
│                            │              ▼                     │ │
│                            │  ┌─────────────────────────────┐  │ │
│                            │  │     SUPABASE SELF-HOSTED     │  │ │
│                            │  │  ┌───────┐ ┌──────┐ ┌─────┐  │  │ │
│                            │  │  │ Kong  │ │Auth  │ │Realt│  │  │ │
│                            │  │  │:8000  │ │:9999 │ │:4000│  │  │ │
│                            │  │  └───────┘ └──────┘ └─────┘  │  │ │
│                            │  │  ┌───────┐ ┌────────────┐   │  │ │
│                            │  │  │Postgrest│ │Storage API│   │  │ │
│                            │  │  │ :3000  │ │  :5000    │   │  │ │
│                            │  │  └───────┘ └────────────┘   │  │ │
│                            │  │         │                   │  │ │
│                            │  │  ┌──────┴──────────────┐    │  │ │
│                            │  │  │   PostgreSQL 15     │    │  │ │
│                            │  │  │      :5432          │    │  │ │
│                            │  │  └─────────────────────┘    │  │ │
│                            │  └─────────────────────────────┘  │ │
│                            └─────────────────────────────────┘ │
│                                         │                       │
│                            ┌────────────┴────────────┐          │
│                            │   PERSISTENT STORAGE    │          │
│                            │  /data/supabase/db-data │          │
│                            └─────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Stack-Übersicht:**
- **Frontend:** Next.js 14 (Docker, Coolify)
- **Backend:** Supabase Self-Hosted (PostgreSQL, GoTrue, Realtime)
- **Infrastructure:** Coolify (GitOps, Auto-Deploy)
- **Domain:** reinplaner.de (prod), dev.reinplaner.de (dev)

**Detaillierte Doku:** [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)

---

## 2. Phase 1: Coolify Installation

### Voraussetzungen
- Ubuntu 22.04/24.04 Server
- Docker + Docker Compose installiert
- 48 GB RAM, 32 Kerne
- DNS zeigt auf Server-IP

### Installation (5 Minuten)
```bash
curl -fsSL https://get.coolify.io | sudo bash
```
- Web-Interface: `http://<SERVER_IP>:3000`
- Admin-Account erstellen
- **Settings → Let's Encrypt** aktivieren

### GitHub verbinden
1. New Project → ReinPlaner
2. Add Source → GitHub
3. OAuth App oder Personal Access Token
4. Repository: `muri72/ReinPlaner`

**Detaillierte Doku:** [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)

---

## 3. Phase 2: Supabase Self-Hosted

### Starten (Docker Compose)
```bash
cd /home/ubuntu/ReinPlaner
docker compose -f docker-compose.prod.yml up -d
```

### Benötigte Services
| Service | Port | Status |
|---------|------|--------|
| PostgreSQL + PostgREST | 5432/3000 | ✅ Pflicht |
| GoTrue (Auth) | 9999 | ✅ Pflicht |
| Realtime | 4000 | ✅ Pflicht |
| Kong (API Gateway) | 8000 | ✅ Pflicht |
| Studio (Dashboard) | 8000 | ✅ Pflicht |
| Storage (MinIO) | 9000/9001 | ⚠️ Optional |

### Wichtige Env-Variablen
```bash
POSTGRES_PASSWORD=     # DB Passwort
JWT_SECRET=            # JWT Signing (von Cloud übernehmen!)
ANON_KEY=             # Public API Key
SERVICE_ROLE_KEY=     # Private API Key
REALTIME_ENC_KEY=     # 32+ Zeichen
SMTP_*=               # Resend SMTP für Emails
```

**Detaillierte Doku:** [SELF-HOSTED-SUPABASE.md](./SELF-HOSTED-SUPABASE.md)

---

## 4. Phase 3: Deployment Pipelines in Coolify

### Environments
| Env | Branch | Domain | URL |
|-----|--------|--------|-----|
| Production | `master` | reinplaner.de | Coming-Soon Page |
| Development | `dev` | dev.reinplaner.de | Vollständige App |

### Coolify Config (für beide)
```
Build Pack: Dockerfile
Port: 3000
HTTPS: Enabled (Let's Encrypt)
```

### Environment Variables (in Coolify setzen)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.deinedomain.de
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_SENTRY_DSN=<sentr_dsn>
RESEND_API_KEY=<resend_key>
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de
NODE_ENV=production
```

### Cron-Job Lösung
Coolify hat keine native Cron-Unterstützung. Optionen:
1. **Externer Service** (cron-job.org) — Einfachste Lösung
2. **BullMQ + Redis** — Robust, persistent

**API absichern:**
```typescript
if (key !== process.env.CRON_API_KEY) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Detaillierte Doku:** [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)

---

## 5. Phase 4: Daten-Migration

### Schritte (Zero-Downtime Cutover)

**T-24h: Pre-Migration**
```bash
# 1. Vollständigen DB-Export von Cloud
pg_dump --host=db.[REF].supabase.co --port=5432 \
  --username=postgres --dbname=postgres --schema=public \
  --data-only --format=custom --file=backup.dump

# 2. Auth-Export
pg_dump --host=db.[REF].supabase.co --port=5432 \
  --username=postgres --dbname=postgres --schema=auth \
  --data-only --format=custom --file=auth_backup.dump
```

**T-0h: Cutover**
```bash
# 1. DNS umschalten (TTL vorher auf 60s!)
# api.cloud.supabase.co → api.deinedomain.de

# 2. Self-Hosted starten
docker compose -f docker-compose.prod.yml up -d

# 3. Daten importieren
docker compose -f docker-compose.prod.yml exec -T supabase-db \
  pg_restore --username=postgres --dbname=postgres \
  --data-only --format=custom --no-owner < backup.dump

# 4. Auth importieren
docker compose exec -T supabase-db pg_restore \
  --schema=auth --data-only < auth_backup.dump
```

### ⚠️ WICHTIG
- **JWT_SECRET von Cloud übernehmen** — Sonst müssen sich alle User neu einloggen
- **API Keys NEU generieren** — Cloud-Keys sind nicht übertragbar
- **Alle Clients updaten** — Neue Keys in Apps eintragen

**Detaillierte Doku:** [SUPABASE-MIGRATION.md](./SUPABASE-MIGRATION.md)

---

## 6. Wartung & Betrieb

### Backups
```bash
# DB-Backup (täglich per Cron)
docker compose exec supabase-db pg_dump -U postgres \
  --format=custom --file=/backups/daily_backup.dump

# Backup-Verzeichnis
/data/supabase/backups/
```

### Updates
```bash
# Images aktualisieren
docker compose -f docker-compose.prod.yml pull

# Stack neu starten
docker compose -f docker-compose.prod.yml up -d
```

### Monitoring
| Check | URL | Erwartung |
|-------|-----|-----------|
| API | `/rest/v1/` | JSON mit tables |
| Auth | `/auth/v1/health` | `{"status":"healthy"}` |
| Realtime | WebSocket Port 4000 | Connection ok |
| Studio | Port 8000 | Dashboard erreichbar |

### Logs
```bash
# Alle Services
docker compose -f docker-compose.prod.yml logs -f

# Einzelner Service
docker compose logs -f supabase-db
```

---

## 7. Troubleshooting

### Build schlägt fehl
```bash
# Coolify Logs prüfen oder:
docker compose -f docker-compose.prod.yml logs [service]
```

### Port 3000 nicht erreichbar
- Firewall: `ufw allow 3000`
- Healthcheck-Pfad prüfen: `/health`
- DNS/Cloudflare prüfen

### HTTPS funktioniert nicht
- Let's Encrypt in Coolify Settings aktivieren
- DNS muss auf Server zeigen
- Zertifikats-Logs in Coolify prüfen

### Login funktioniert nicht nach Migration
- JWT_SECRET stimmt nicht mit Cloud überein?
- **Lösung:** Cloud JWT_SECRET übernehmen, neu starten
- Alle User müssen sich neu einloggen (Force-Logout)

### Daten fehlen nach Import
```bash
# RLS Policies prüfen
docker compose exec supabase-db psql -U postgres -c \
  "SELECT * FROM pg_policies WHERE schemaname='public';"

# Trigger prüfen
docker compose exec supabase-db psql -U postgres -c \
  "SELECT * FROM information_schema.triggers WHERE event_schema='public';"
```

### Rollback zu Cloud
```bash
# 1. DNS zurücksetzen
# api.deinedomain.de → api.cloud.supabase.co

# 2. Self-Hosted stoppen (NICHT löschen!)
docker compose stop
```

---

## 8. Nächste Schritte (dev → production)

### Phase 1: Development (Jetzt)
- [ ] Coolify auf Server installieren
- [ ] Supabase Self-Hosted starten
- [ ] dev.reinplaner.de deployen
- [ ] Testdaten importieren
- [ ] Smoke-Tests: Login, Realtime, API

### Phase 2: Daten-Migration
- [ ] Vollständigen Backup von Cloud erstellen
- [ ] JWT_SECRET von Cloud dokumentieren
- [ ] API Keys neu generieren
- [ ] Production-DB importieren
- [ ] Auth-Daten importieren
- [ ] Verification: Alle User können sich einloggen

### Phase 3: Production Cutover
- [ ] TTL auf 60s setzen (24h vorher)
- [ ] DNS für api.reinplaner.de umstellen
- [ ] Monitoring 24h aktiv
- [ ] Rollback-Plan bereit

### Phase 4: Nach Cutover
- [ ] Cloud-Subscription kündigen (nach 24h Beobachtung)
- [ ] Backups automatisieren
- [ ] Monitoring einrichten (UptimeRobot/cron-job.org)
- [ ] Dokumentation aktualisieren

---

## Quick-Reference

```bash
# Supabase starten
docker compose -f docker-compose.prod.yml up -d

# Logs ansehen
docker compose -f docker-compose.prod.yml logs -f

# Alle Services prüfen
docker compose -f docker-compose.prod.yml ps

# Stack stoppen
docker compose -f docker-compose.prod.yml down

# Backup erstellen
docker compose exec supabase-db pg_dump -U postgres --format=custom -f /backups/backup.dump
```

**Alle detaillierten Dokumente:**
- [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)
- [SELF-HOSTED-SUPABASE.md](./SELF-HOSTED-SUPABASE.md)
- [SUPABASE-MIGRATION.md](./SUPABASE-MIGRATION.md)
