# ReinPlaner – Self-Hosting Setup Guide (Deutsch)

**Datum:** 13. Mai 2026  
**Projekt:** ReinPlaner  
**Ziel:** Vollständige Selbstinstallation auf einem eigenen Server (Hetzner)  
**Stack:** Next.js 16 + Self-Hosted Supabase + Coolify

---

## Inhaltsverzeichnis

1. [Überblick](#1-überblick)
2. [Server-Anforderungen](#2-server-anforderungen)
3. [Schritt-für-Schritt Installation](#3-schritt-für-schritt-installation)
4. [Wartung & Updates](#4-wartung--updates)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Überblick

Die Selbsthosting-Installation von ReinPlaner gliedert sich in **drei Phasen**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 1: Server-Setup                        │
│         Coolify installieren, DNS konfigurieren,                │
│         GitHub-Repository verbinden                             │
├─────────────────────────────────────────────────────────────────┤
│                    Phase 2: Supabase-Stack                     │
│         Self-Hosted Supabase auf Docker installieren            │
│         (Postgres, Kong, Studio, Storage, Functions)            │
├─────────────────────────────────────────────────────────────────┤
│                    Phase 3: ReinPlaner Deployment               │
│         Coolify-Anwendungen für Production + Development        │
│         Environment-Variablen setzen, Auto-Deploy aktivieren    │
└─────────────────────────────────────────────────────────────────┘
```

**Architektur:**

```
Internet
    │
    ▼
Caddy (TLS, Port 443/80) ——— Reverse Proxy
    │
    ├──► Next.js App (Coolify) ——— Port 3000
    │
    └──► Supabase Stack (internes Docker-Netzwerk)
            ├── Kong Gateway       :54321  (API)
            ├── Postgres           :5432
            ├── Studio             :3000   (Dashboard)
            ├── Storage            :5000
            ├── Functions          :9000
            ├── Analytics          :5437
            ├── PostgREST          :3000
            ├── Postgres Meta       :54381
            ├── Realtime           :3500
            ├── Imgproxy           :5001
            └── Backup             :54320
```

**Branch-zu-Umgebung Mapping:**

| GitHub Branch | Coolify Umgebung | Domain |
|---|---|---|
| `master` | Production | `reinplaner.de` |
| `dev` | Development | `dev.reinplaner.de` |

---

## 2. Server-Anforderungen

### Hardware (Hetzner empfohlen)

| Ressource | Minimum | Empfohlen |
|---|---|---|
| **RAM** | 32 GB | 48 GB |
| **CPU** | 16 vCPU | 32 vCPU |
| **NVMe Storage** | 500 GB | 2× 6 TB |
| **Backup Storage** | Separat empfohlen | Hetzner Storage Box |

**Getestete Konfigurationen:**
- **Hetzner AX101** (48 GB RAM, 32 vCPU, 2× 6 TB NVMe)
- **Hetzner NJ1** (identisch, alternative Rechenzentrum)

### Software

| Komponente | Version |
|---|---|
| **Ubuntu** | 22.04 LTS |
| **Docker** | Latest (via Coolify Installerskript) |
| **Coolify** | Latest |
| **Docker Compose** | v2 (im Lieferumfang von Coolify) |

### Domains / DNS

Vor der Installation müssen folgende DNS-Einträge existieren:

| Hostname | Typ | Ziel | TTL |
|---|---|---|---|
| `reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `dev.reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `coolify.reinplaner.de` | A | `<SERVER_IP>` | 300 (optional) |

> **Hinweis:** DNS muss vor dem Deployment vollständig konfiguriert sein. Anleitung unter [DNS-SETUP.md](./DNS-SETUP.md).

---

## 3. Schritt-für-Schritt Installation

### Phase 1: Coolify Installation

#### 3.1.1 Coolify auf Ubuntu 22.04 installieren

```bash
# Per SSH auf den Server
ssh root@<YOUR_SERVER_IP>

# Offizielles Coolify Installerskript ausführen
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Das Skript installiert automatisch:
- Docker & Docker Compose
- Nginx als Reverse Proxy
- Coolify auf Port 8000
- Einen Non-Root-Benutzer (`coolify`)

#### 3.1.2 Erste Konfiguration (After-Run)

1. Coolify im Browser öffnen: `http://<YOUR_SERVER_IP>:8000`
2. Beim ersten Zugriff wird ein **Admin-Passwort** abgefragt — festlegen
3. **Public Domain** konfigurieren (z.B. `coolify.reinplaner.de`)
4. **SSH-Key** für Git-Zugriff generieren oder hochladen

#### 3.1.3 DNS für Coolify (optional)

Für HTTPS-Zugriff auf Coolify:

1. DNS A-Record `coolify.reinplaner.de` → `<SERVER_IP>` setzen
2. In Coolify unter **Settings → Public Domains** die Domain hinzufügen
3. Let's Encrypt Zertifikat wird automatisch ausgestellt

---

### Phase 2: GitHub Repository verbinden

#### 3.2.1 Option A — GitHub App (empfohlen für Organisationen)

1. **Sources → Add Source → GitHub**
2. Auf **Install GitHub App** klicken
3. Auf GitHub die App für das Konto/die Organisation autorisieren
4. Gewünschte Repositories auswählen (`muri72/ReinPlaner` oder gesamte Organisation)
5. In Coolify die Quelle auswählen

#### 3.2.2 Option B — Personal Access Token (einfacher)

1. GitHub → **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Neues Token mit `repo` Scope erstellen
3. Coolify → **Sources → Add Source → GitHub → Use PAT**
4. Token einfügen

Das Repository `muri72/ReinPlaner` steht danach bei der Projekterstellung zur Verfügung.

---

### Phase 3: Coolify Umgebungen erstellen

#### 3.3.1 Produktions-Umgebung

| Feld | Wert |
|---|---|
| Name | `production` |
| Default Domain | `reinplaner.de` |
| SSL | ✅ Aktiv (Let's Encrypt) |

#### 3.3.2 Entwicklungs-Umgebung

| Feld | Wert |
|---|---|
| Name | `development` |
| Default Domain | `dev.reinplaner.de` |
| SSL | ✅ Aktiv (Let's Encrypt) |

> **Wichtig:** DNS A-Records für beide Domains müssen vor dem Speichern auf den Server zeigen.

---

### Phase 4: Self-Hosted Supabase installieren

#### 3.4.1 Verzeichnisstruktur anlegen

```bash
# Auf dem Hetzner Server
mkdir -p /opt/reinplaner/supabase/{migrations,functions,seed}
mkdir -p /opt/reinplaner/backups
cd /opt/reinplaner
```

#### 3.4.2 Environment-Datei erstellen

```bash
# /opt/reinplaner/.env
nano /opt/reinplaner/.env
```

```bash
# ============================================================
# ReinPlaner — Self-Hosted Supabase Umgebungsvariablen
# ============================================================

# PostgreSQL
POSTGRES_PASSWORD=<STRONG_PASSWORD>

# Supabase JWT (generieren: openssl rand -base64 32)
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

#### 3.4.3 Docker Compose starten

```bash
cd /opt/reinplaner

# Supabase Stack starten (nur Postgres zuerst für initiale Migration)
docker-compose -f docker-compose.prod.yml up -d postgres

# Warten bis Postgres healthy ist (~30 Sekunden)
docker ps --format "table {{.Names}}\t{{.Status}}"

# Alle Services starten
docker-compose -f docker-compose.prod.yml up -d
```

#### 3.4.4 Container-Health prüfen

```bash
# Alle Services prüfen
docker ps --format "table {{.Names}}\t{{.Status}}"

# Einzelne Services testen
curl http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY"   # PostgREST
curl http://localhost:3000/api/health                           # Studio
curl http://localhost:5000/status                               # Storage
curl http://localhost:9000/status                               # Functions
```

---

### Phase 5: Daten migrieren (falls von Supabase Cloud umgezogen)

> Vollständige Anleitung: [SUPABASE-MIGRATION.md](./SUPABASE-MIGRATION.md)

#### 3.5.1 Datenbank-Dump von Supabase Cloud

```bash
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

#### 3.5.2 Restore auf Self-Hosted

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
    < ./migration_dump_YYYYMMDD.dump
```

#### 3.5.3 JWT-Secrets neu generieren

```bash
# Neue Secrets generieren (WARNUNG: invalidiert bestehende Nutzer-Sessions)
openssl rand -base64 32   # Für JWT_SECRET
openssl rand -base64 32   # Für ANON_KEY
openssl rand -base64 32   # Für SERVICE_ROLE_KEY
openssl rand -base64 32   # Für META_ADMIN_TOKEN
```

> **⚠️ Achtung:** Nach JWT-Rotation müssen sich alle Nutzer erneut anmelden.

---

### Phase 6: DNS konfigurieren

#### 3.6.1 DNS-Einträge erstellen

| Name | Typ | Wert | TTL |
|---|---|---|---|
| `dev.reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `reinplaner.de` | A | `<SERVER_IP>` | 300 |
| `www.reinplaner.de` | CNAME | `reinplaner.de` | 300 |

Detaillierte Anleitung je nach Registrar: [DNS-SETUP.md](./DNS-SETUP.md)

#### 3.6.2 DNS-Propagation prüfen

```bash
# A-Record prüfen
dig A dev.reinplaner.de +short
# Erwartet: <SERVER_IP>

# CNAME prüfen
dig CNAME www.reinplaner.de +short
# Erwartet: reinplaner.de.
```

#### 3.6.3 Cloudflare-Hinweis

Falls Cloudflare als DNS-Provider genutzt wird:

- Während der Einrichtung: Proxy auf **DNS only** (graue Wolke) setzen
- Nach Verifikation auf **Proxied** (orange Wolke) wechseln
- Let's Encrypt Zertifikate direkt auf dem Server verwalten

---

### Phase 7: Coolify Anwendungen erstellen

#### 3.7.1 Neues Coolify Projekt

1. **Projects → New Project → Create Project**
2. Name: `ReinPlaner`

#### 3.7.2 Production-App (master Branch)

1. **Add New Resource → Application**
2. **GitHub**: `muri72/ReinPlaner` auswählen
3. **Branch**: `master`
4. **Build Pack**: `Nixpacks` (erkennt Next.js automatisch) oder `Dockerfile`
5. **Environment**: `production`
6. **Port**: `3000`

**Deployment-Einstellungen:**

- ✅ **Autodeploy**: Bei Push auf `master`
- **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
- **Start Command**: `pnpm start`

#### 3.7.3 Environment-Variablen (Production)

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-domain>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_BASE_URL=https://reinplaner.de
RESEND_API_KEY=<RESEND_API_KEY>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### 3.7.4 Development-App (dev Branch)

1. **Add New Resource → Application**
2. **GitHub**: `muri72/ReinPlaner`
3. **Branch**: `dev`
4. **Environment**: `development`
5. **Domain**: `dev.reinplaner.de`
6. **Port**: `3000`

**Environment-Variablen (Development):**

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-domain>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de
RESEND_API_KEY=<RESEND_API_KEY>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

---

### Phase 8: Erster Deployment & Verifikation

#### 3.8.1 Deployment starten

**In Coolify auf "Deploy" klicken.** Coolify führt folgende Schritte aus:

```
1. Repository klonen
2. Next.js Build (Nixpacks erkennt Framework automatisch)
3. Docker Container auf Port 3000 starten
4. Let's Encrypt SSL-Zertifikat ausstellen
5. Domain `reinplaner.de` / `dev.reinplaner.de` auf Container zeigen
```

#### 3.8.2 Post-Deployment Checkliste

**Anwendung:**
- [ ] `https://reinplaner.de` ist erreichbar (HTTP 200)
- [ ] Login / Registrierung funktioniert
- [ ] Seiten laden ohne JavaScript-Fehler in der Konsole

**Supabase API:**
- [ ] `curl https://<supabase-domain>/rest/v1/` → HTTP 200
- [ ] Auth: Neue Registrierung möglich
- [ ] Storage: Datei-Upload funktioniert
- [ ] Functions: `/functions/send-email` erreichbar

**SSL:**
- [ ] `https://reinplaner.de` zeigt grünes Schloss (TLS gültig)
- [ ] `https://dev.reinplaner.de` zeigt grünes Schloss

---

### Phase 9: Rollback-Strategie

#### 3.9.1 Sofort-Rollback via Coolify

1. **Application → Deployments**
2. Letzte funktionierende Version auswählen
3. **Rollback**-Button (↩️) klicken

Coolify wechselt ohne Rebuild sofort zum vorherigen Docker Image.

#### 3.9.2 Manueller Rollback via Git

```bash
# Auf dem Server
git checkout <previous-commit-hash>
git pull origin master
# Coolify erkennt Änderung und deployed automatisch
```

#### 3.9.3 Pre-Production Smoke Test

Für `master` Branch:

1. **Autodeploy deaktivieren** vor dem Push
2. Push zu `master` → Coolify baut, schaltet aber **nicht** auf Live-Traffic
3. In Coolify die neue Version unter der Vorschau-URL prüfen
4. Wenn OK: **Redeploy** klicken für Live-Schaltung

---

## 4. Wartung & Updates

### 4.1 Coolify aktualisieren

```bash
# SSH auf Server
ssh root@<YOUR_SERVER_IP>

# Coolify updaten
cd ~/coolify && docker compose pull && docker compose up -d
```

### 4.2 ReinPlaner aktualisieren

Dank Auto-Deploy bei Git-Push:

```bash
# Auf lokalem Rechner
git checkout master
git pull origin master
git merge <feature-branch>
git push origin master
# → Coolify erkennt Push, baut und deployed automatisch
```

### 4.3 Supabase Stack aktualisieren

```bash
cd /opt/reinplaner

# Alle Container aktualisieren
docker-compose -f docker-compose.prod.yml pull

# Mit neuem Image neu starten
docker-compose -f docker-compose.prod.yml up -d
```

### 4.4 Backup prüfen

Das Backup-Container läuft automatisch (Standard: 02:00 Uhr):

```bash
# Backup-Logs prüfen
docker logs supabase_backup --tail=50

# Backup-Volume prüfen
ls -la /opt/reinplaner/backups/
```

### 4.5 Log-Analyse

```bash
# Supabase Postgres Logs
docker logs supabase_postgres --tail=100 -f

# Kong API Gateway Logs
docker logs supabase_kong --tail=100 -f

# Next.js App Logs (Coolify Dashboard oder)
docker logs reinplaner_production --tail=100 -f
```

---

## 5. Troubleshooting

### 5.1 Coolify ist nicht erreichbar

```bash
# Coolify Service-Status prüfen
sudo systemctl status coolify

# Logs ansehen
sudo journalctl -u coolify -f

# Neustart
sudo systemctl restart coolify
```

### 5.2 Supabase Services starten nicht

```bash
# Alle Container auflisten
docker ps -a

# Logs des defekten Containers ansehen
docker logs <container_name> --tail=100

# Häufige Ursachen:
#   - POSTGRES_PASSWORD fehlt in .env
#   - Port bereits belegt (z.B. Port 5432 von anderem Postgres)
#   - Nicht genug RAM (min. 32GB empfohlen)
```

### 5.3 Datenbank-Verbindungsprobleme

```bash
# Prüfen ob Postgres läuft und healthy ist
docker inspect supabase_postgres | grep -A 10 '"Health"'

# Direkte Verbindung testen
docker exec -it supabase_postgres psql -U supabase_admin -d postgres

# Aus .env prüfen
cat /opt/reinplaner/.env | grep POSTGRES
```

### 5.4 SSL / HTTPS funktioniert nicht

1. DNS muss auf den Server zeigen (Propagation prüfen: `dig A reinplaner.de`)
2. Domain in Coolify unter **Settings → Public Domains** als Public Domain eingetragen?
3. Let's Encrypt Zertifikat erreicht?

```bash
# Caddy/Let's Encrypt Logs prüfen
docker logs caddy --tail=50
```

### 5.5 Next.js App startet nicht nach Deployment

- **Build schlägt fehl:** In Coolify unter **Build Logs** prüfen
- **Port belegt:** Anderer Prozess auf Port 3000? → `lsof -i :3000`
- **Fehlende Environment-Variablen:** Sind alle Variablen aus Abschnitt 3.7.3 gesetzt?
- **Node-Version:** Nixpacks sollte Next.js 16 automatisch erkennen; bei Problemen `Dockerfile` als Build Pack wählen

### 5.6 Auth funktioniert nicht nach Migration

- **JWT Secret geändert?** → Alle Nutzer müssen sich neu anmelden
- **auth.users Tabelle restauriert?** → `SELECT COUNT(*) FROM auth.users;`
- **Identities intakt?** → `SELECT COUNT(*) FROM auth.identities;`

### 5.7 Edge Functions nicht erreichbar

```bash
# Functions-Container Status
docker ps | grep functions

# Health-Endpoint direkt
curl http://localhost:9000/status

# Functions-Logs
docker logs supabase_functions --tail=100

# Kong Routes prüfen ( kong.prod.yml )
cat /opt/reinplaner/supabase/kong.prod.yml | grep functions
```

### 5.8 Performance-Probleme

| Symptom | Lösung |
|---|---|
| Langsame API-Antworten | Postgres `shared_buffers` prüfen (Standard: 12GB auf 48GB-System) |
| Hoher Memory-Verbrauch | Container `mem_limit` in `docker-compose.prod.yml` reduzieren |
| Langsame Storage-Uploads | Hetzner Object Storage als S3-Backend konfigurieren |
| Hohe CPU-Last | `cpus` Limits in docker-compose prüfen, ggf. erhöhen |

### 5.9 Hilfe & Logs sammeln

Bei Support-Anfragen immer folgende Informationen bereithalten:

```bash
# Coolify Version
cd ~/coolify && docker compose ps

# Docker Version
docker --version

# Container Status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Installation Directory
ls -la /opt/reinplaner/

# Supabase Stack Logs (alle Services)
docker logs supabase_postgres --tail=50
docker logs supabase_kong --tail=50
docker logs supabase_studio --tail=50
```

---

## Checkliste: Installation abgeschlossen

- [ ] Server provisioning (Ubuntu 22.04, DNS konfiguriert)
- [ ] Coolify via offiziellem Skript installiert
- [ ] GitHub App / PAT mit `muri72/ReinPlaner` verbunden
- [ ] Zwei Umgebungen erstellt: `production`, `development`
- [ ] DNS A-Records für `reinplaner.de` und `dev.reinplaner.de`
- [ ] Self-Hosted Supabase Stack läuft und ist healthy
- [ ] Daten von Supabase Cloud migriert (falls zutreffend)
- [ ] Production App → `master` Branch → `reinplaner.de`
- [ ] Development App → `dev` Branch → `dev.reinplaner.de`
- [ ] Alle Environment-Variablen gesetzt
- [ ] Auto-Deploy auf beiden Branches aktiviert
- [ ] Erster Deployment erfolgreich
- [ ] Rollback-Strategie getestet
- [ ] SSL-Zertifikate aktiv und gültig
