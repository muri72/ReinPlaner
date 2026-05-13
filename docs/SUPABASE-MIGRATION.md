# Supabase Cloud → Self-Hosted Migration Plan

**Datum:** 13. Mai 2026  
**Ziel:** Zero-Downtime Migration von Supabase Cloud zu Self-Hosted (Docker)  
**Risikoprofil:** Mittel — PostgreSQL Schema, Auth, Realtime betroffen

---

## Übersicht

| Komponente | Status Cloud | Aufwand | Risiko |
|---|---|---|---|
| PostgreSQL Schema + Daten | ✅ Aktiv | ⭐⭐⭐ | Mittel |
| Auth Users | ✅ Aktiv | ⭐⭐ | Niedrig |
| Realtime | ✅ Aktiv | ⭐ | Niedrig |
| Edge Functions | ⚠️ 1 Function (`send-email`) | ⭐⭐ | Mittel |
| Storage | ❌ Nicht genutzt | — | — |
| API Keys (anon/service_role) | ✅ Aktiv | ⭐⭐ | Mittel |

---

## 1. Datenbank Export/Import (pg_dump)

### Phase 1a: Vollständiger Datenbank-Export (Cloud)

```bash
# Auf der Cloud-Konsole oder mit Zugangsdaten
pg_dump \
  --host=db.[PROJECT-REF].supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --data-only \
  --rows-per-insert=1000 \
  --format=custom \
  --file=backup_before_migration.dump
```

**Wichtige Flags:**
- `--schema=public` — Nur das public-Schema (nicht `_realtime`, `auth`, `storage`)
- `--data-only` — Struktur (Tabellen) wird in Self-Hosted neu erstellt
- `--rows-per-insert=1000` — Bessere Performance beim Import

### Phase 1b: Schema-Export (Optional — wenn neue Tabellen entstehen)

```bash
pg_dump \
  --host=db.[PROJECT-REF].supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --schema-only \
  --format=plain \
  --file=schema_dump.sql
```

### Phase 2: Daten-Import auf Self-Hosted

```bash
# Auf dem Self-Hosted Server
docker compose -f docker-compose.prod.yml up -d supabase-db

# Warten bis DB bereit
docker compose -f docker-compose.prod.yml exec supabase-db pg_isready -U postgres

# Import
docker compose -f docker-compose.prod.yml exec -T supabase-db \
  pg_restore \
    --username=postgres \
    --dbname=postgres \
    --data-only \
    --format=custom \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    < backup_before_migration.dump
```

**ACHTUNG:** `--clean --if-exists` löscht existierende Tabellen zuerst. Bei laufender Produktion vorher prüfen!

### Phase 3: RLS + Trigger verifizieren

```bash
# Prüfen ob RLS Policies noch aktiv
docker compose -f docker-compose.prod.yml exec supabase-db \
  psql -U postgres -d postgres -c \
  "SELECT schemaname, tablename, polname, polcmd FROM pg_policies WHERE schemaname='public';"

# Trigger prüfen
docker compose -f docker-compose.prod.yml exec supabase-db \
  psql -U postgres -d postgres -c \
  "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_schema='public';"
```

---

## 2. Auth User Migration

Supabase Auth speichert User in zwei Tabellen:
- `auth.users` (GoTrue)
- `auth.identities` (OAuth-Provider)
- `auth.refresh_tokens` (Sitzungen)

### Export der Auth-Daten

```bash
pg_dump \
  --host=db.[PROJECT-REF].supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=auth \
  --data-only \
  --format=custom \
  --file=auth_backup.dump
```

### Import der Auth-Daten

```bash
# Schema auth existiert bereits in Self-Hosted (aus Migrations)
docker compose -f docker-compose.prod.yml exec -T supabase-db \
  pg_restore \
    --username=postgres \
    --dbname=postgres \
    --schema=auth \
    --data-only \
    --format=custom \
    --no-owner \
    --no-acl \
    < auth_backup.dump
```

### Wichtige Prüfungen nach Auth-Import

```sql
-- User-Count prüfen
SELECT COUNT(*) FROM auth.users;

-- Letzte Anmeldungen prüfen
SELECT id, email, last_sign_in_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Identitäten prüfen (für OAuth-User)
SELECT user_id, provider, provider_id FROM auth.identities LIMIT 10;

-- Refresh Tokens prüfen
SELECT COUNT(*) FROM auth.refresh_tokens;
```

### JWT-Secret Abgleich

```bash
# Cloud: SUPABASE_JWT_SECRET (aus Dashboard)
# Self-Hosted: JWT_SECRET (in .env)

# Prüfen ob Secrets übereinstimmen — sonst sind alle bestehenden Tokens invalide!
# => NEUE JWT_SECRET = ALLE USER MÜSSEN SICH NEU EINLOGGEN
```

**Empfehlung:** Bestehende JWT_SECRET von Cloud übernehmen, damit bestehende Sessions gültig bleiben.

---

## 3. Storage Migration

**Status: NICHT ERFORDERLICH**

Die Codebasis nutzt aktuell kein Supabase Storage:
- Keine `storage.upload()` Aufrufe gefunden
- Keine `storage` Importe in `.ts`/`.tsx` Dateien
- MinIO ist in docker-compose.prod.yml zwar konfiguriert, wird aber nicht aktiv verwendet

### Falls Storage später benötigt wird

```bash
# Cloud Storage Buckets auflisten
# Über Supabase Dashboard > Storage > Buckets

# Bei Bedarf: S3-kompatible Migration mit mc (MinIO Client)
docker compose -f docker-compose.prod.yml exec storage \
  mc alias set local http://localhost:9000 \
    ${S3_PROTOCOL_ACCESS_KEY_ID} \
    ${S3_PROTOCOL_ACCESS_KEY_SECRET}

# Bucket erstellen
docker compose -f docker-compose.prod.yml exec storage \
  mc mb local/my-bucket --region eu-central-1
```

---

## 4. Edge Functions Migration

**1 Edge Function vorhanden:** `send-email`

### Cloud → Self-Hosted Übertragung

Edge Functions müssen auf dem Self-Hosted Deno-Server neu deployt werden:

```bash
# 1. Cloud Function Code exportieren (aus Dashboard oder CLI)
supabase functions download send-email --project-id [PROJECT-REF]

# 2. In Self-Hosted Environment deployen
# Deno Deploy oder alternativ als Docker-Container

# 3. Secrets für Self-Hosted Edge Functions setzen
# In gotrue oder über Umgebungsvariablen:
RESEND_API_KEY=${RESEND_API_KEY}
```

### Alternative: Email-Versand ohne Edge Function

Falls Deno-Server nicht betrieben werden soll, Email-Versand via SMTP direkt in der Anwendung:

```typescript
// In der App: Resend SDK direkt (serverseitig)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'ReinPlaner <noreply@deinedomain.de>',
  to: recipient,
  subject: subject,
  html: content,
});
```

### send-email Function Details

- **Endpoints:** HTTP POST `/functions/v1/send-email`
- **Rate Limiting:** 10 Emails/Minute pro Tenant (in-memory)
- **Externe Abhängigkeit:** Resend API Key
- **CORS:** Erlaubt alle Origins (`*`)

---

## 5. Env-Variablen Wechsel (Cloud → Self-hosted)

### benötigte Umgebungsvariablen

```bash
# ==============================================
# Datenbank
# ==============================================
POSTGRES_PASSWORD=                    # PostgreSQL Passwort
JWT_SECRET=                           # JWT Signing Secret (von Cloud übernehmen!)

# ==============================================
# Externe URLs
# ==============================================
API_EXTERNAL_URL=https://api.deinedomain.de
SITE_URL=https://deinedomain.de
ALLOWED_URLS=https://deinedomain.de,https://app.deinedomain.de

# ==============================================
# Auth / SMTP
# ==============================================
SMTP_ADMIN_EMAIL=noreply@deinedomain.de
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxx                    # Resend SMTP Token
SMTP_SENDER_NAME=ReinPlaner
MAIL_AUTOCONFIRM=false                # true = Email wird sofort bestätigt (für Dev)

# ==============================================
# Storage (MinIO)
# ==============================================
S3_PROTOCOL_ACCESS_KEY_ID=minioadmin
S3_PROTOCOL_ACCESS_KEY_SECRET=minioadmin

# ==============================================
# Realtime
# ==============================================
REALTIME_ENC_KEY=                     # 32+ Zeichen Zufallsstring

# ==============================================
# API Keys (müssen neu generiert werden!)
# ==============================================
ANON_KEY=                             # z.B. eyJhbGc... (public, client-safe)
SERVICE_ROLE_KEY=                     # z.B. eyJhbGc... (privat, server-only)
```

### API Keys neu generieren

Supabase Cloud Keys sind nicht direkt übertragbar. Auf Self-Hosted:

```bash
# anon Key generieren (Public)
openssl rand -base64 32

# service_role Key generieren (Private)
openssl rand -base64 32

# Diese Keys dann in der App als:
# NEXT_PUBLIC_SUPABASE_URL=https://api.deinedomain.de
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
# SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

**⚠️ WICHTIG:** Alle Clients müssen die neuen Keys erhalten!

### Key-Rotation ohne Force-Logout

Falls JWT_SECRET vom Cloud übernommen wird, bleiben bestehende Sessions gültig. Bei Key-Rotation:

1. **Opt-in Rotation:** Kumulative Strategie über Cookie/Header
2. **Force-Logout:** Alle User müssen sich neu anmelden (einfacher, sicherer)

---

## 6. Zero-Downtime Cutover Plan

### Timeline (Geplanter Maintenance-Window: 2-4 Stunden)

```
T-24h  ┌──────────────────────────────────────────────
       │ Pre-Migration Checks
       │ - Self-Hosted Stack vollständig aufgebaut
       │ - Test-Daten importiert
       │ - Smoke-Tests bestanden
       │ - .env Dateien vorbereitet
       │ - Backup aller Daten von Cloud erstellt
       │
T-2h   ┌──────────────────────────────────────────────
       │ Final Pre-Flight Check
       │ - DNS-Änderungen vorbereitet (TTL prüfen)
       │ - Monitoring Alerts aktiviert
       │ - Rollback-Team informiert
       │
T-0h   ┌──────────────────────────────────────────────
       │ 🟢 CUTOVER START
       │
       │ 1. Traffic auf Self-Hosted umschalten
       │    DNS: api.cloud.supabase.co → api.deinedomain.de
       │    (TTL vorher auf 60s setzen!)
       │
       │ 2. Self-Hosted Stack starten
       │    docker compose -f docker-compose.prod.yml up -d
       │
       │ 3. Daten-Sync (Falls noch Writes auf Cloud)
       │    Finaler pg_dump Import
       │
       │ 4. Auth-Sync
       │    Finaler auth_backup Import
       │
T+30m  ┌──────────────────────────────────────────────
       │ ✅ Post-Cutover Verification
       │ - Login funktioniert
       │ - Realtime Connection hergestellt
       │ - API Requests funktionieren
       │ - Edge Function erreichbar
       │
T+2h   ┌──────────────────────────────────────────────
       │ 🟢 CUTOVER ABGESCHLOSSEN
       │ Monitoring 24h aktiv
```

### Schritt-für-Schritt Cutover Kommandos

```bash
# ============================================
# AUF DEM SELF-HOSTED SERVER
# ============================================

# 1. DNS umschalten (vorher TTL prüfen!)
# Cloudflare/Route53: api.cloud.supabase.co → api.deinedomain.de

# 2. Self-Hosted Stack starten
cd /home/ubuntu/ReinPlaner
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 3. Warten auf alle Services
sleep 30
docker compose -f docker-compose.prod.yml ps

# 4. Finalen Daten-Import (wenn noch delta)
docker compose -f docker-compose.prod.yml exec -T supabase-db \
  pg_restore --username=postgres --dbname=postgres \
    --data-only --format=custom --no-owner --no-acl \
    < /backups/backup_before_migration.dump

# 5. Auth Import
docker compose -f docker-compose.prod.yml exec -T supabase-db \
  pg_restore --username=postgres --dbname=postgres \
    --schema=auth --data-only --format=custom --no-owner --no-acl \
    < /backups/auth_backup.dump

# 6. Verification
curl -s https://api.deinedomain.de/rest/v1/ | jq .tables
curl -s https://api.deinedomain.de/auth/v1/health | jq .
```

### Verification Checks

```bash
# API erreichbar
curl -s https://api.deinedomain.de/rest/v1/ -H "apikey: $ANON_KEY" | jq

# Auth Health
curl -s https://api.deinedomain.de/auth/v1/health -H "apikey: $ANON_KEY" | jq

# Realtime WebSocket
wscat -c wss://api.deinedomain.de/realtime/v1/websocket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Edge Function
curl -s -X POST https://api.deinedomain.de/functions/v1/send-email \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","body":"Test"}'
```

---

## 7. Rollback-Prozedur

### Automatischer Rollback Trigger

Falls nach Cutover kritische Fehler auftreten:

```bash
# ============================================
# ROLLBACK ZU SUPABASE CLOUD
# ============================================

# 1. DNS zurücksetzen
# Cloudflare/Route53: api.deinedomain.de → api.cloud.supabase.co

# 2. Self-Hosted Stack stoppen (Daten NICHT löschen!)
docker compose -f docker-compose.prod.yml stop

# 3. Warten auf DNS-Propagation (2-5 Minuten)
# TTL vorher auf 60s setzen war wichtig!

# 4. Cloud-Verbindung verifizieren
curl -s https://db.[PROJECT-REF].supabase.co/rest/v1/ -H "apikey: $CLOUD_ANON_KEY" | jq

# 5. Monitoring: Keine anomalien mehr?
```

### Rollback Entscheidungsmatrix

| Problem | Schwere | Aktion |
|---|---|---|
| API nicht erreichbar | 🔴 Kritisch | Sofort-Rollback |
| Login funktioniert nicht | 🔴 Kritisch | Sofort-Rollback |
| Datenverlust vermutet | 🔴 Kritisch | Sofort-Rollback |
| Langsame Response-Zeiten | 🟡 Mittel | 30 Min beobachten, dann entscheiden |
| Nicht-kritische Edge Function down | 🟢 Niedrig | Später fixen |
| Kleine Inkonsistenzen | 🟢 Niedrig | Monitoring, später korrigieren |

### Datenkonsistenz nach Rollback

Falls zwischen Cloud und Self-Hosted Daten divergieren:

```bash
# ============================================
# DATENBANK RE-SYNC (falls nötig)
# ============================================

# 1. Cloud ist Primary — alle Daten bleiben dort
# 2. Self-Hosted Datenbank als Backup behalten
docker compose -f docker-compose.prod.yml stop
# NICHT löschen! Daten können für forensische Analyse benötigt werden

# 3. Optional: Export letzter Änderungen von Self-Hosted
#    (Nur wenn Write-Zugriffe möglich waren)
docker compose -f docker-compose.prod.yml exec supabase-db \
  pg_dump --schema=public --data-only --format=custom \
  > /backups/selfhosted_delta_$(date +%Y%m%d_%H%M%S).dump
```

### Re-Cutover Planung

Nach einem Rollback:

1. **Nie am selben Tag erneut cutovern** — Mindestens 24h Pause
2. **Root-Cause Analyse** durchführen
3. **Fix implementieren und testen**
4. **Nächsten Maintenance-Window planen**

---

## Checkliste Pre-Migration

```bash
# DB-Zugang Cloud funktioniert
pg_isready -h db.[PROJECT-REF].supabase.co -p 5432 -U postgres

# Self-Hosted Stack startet fehlerfrei
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs --tail=50

# Alle Health-Checks grün
curl -s http://localhost:3000/ | jq .status  # PostgREST
curl -s http://localhost:9999/health | jq .status  # GoTrue
curl -s http://localhost:4000/health | jq  # Realtime

# .env Datei vollständig
grep -v "^#" .env | grep -v "^$" | wc -l  # Sollte > 15 sein

# Backup erstellt
ls -la /backups/backup_*.dump

# DNS TTL bekannt (sollte < 300 sein)
dig +ttl api.deinedomain.de
```

---

## Post-Migration (Nach 24h Monitoring)

1. **Cloud-Projekt NICHT löschen** — mindestens 7 Tage aufbewahren
2. **Supabase Cloud Plan downgraden** (oder kündigen nach Prüfung)
3. **SSL-Zertifikate erneuern** falls selbst signiert
4. **Monitoring permanent aktivieren** (UptimeRobot, Datadog, etc.)
5. **Dokumentation aktualisieren:** Neue API-URL in allen Configs

---

## Support & Troubleshooting

- **Supabase Self-Hosted Docs:** https://supabase.com/docs/guides/self-hosting
- **Docker Setup:** `/home/ubuntu/ReinPlaner/docker-compose.prod.yml`
- **Architektur-Details:** `/home/ubuntu/ReinPlaner/docs/SELF-HOSTED-SUPABASE.md`
