# Deployment-Evaluation — ReinPlaner

**Datum:** 12. Mai 2026  
**Stack:** Next.js 16 (App Router, React 19) + Supabase + Vercel  
**Kontext:** Kleines SaaS (100+ Tenants, 10k+ Nutzer geplant). Später: Self-Hosting für Kunden auf eigenem VPS.

---

## 1. Aktuelle Situation

ReinPlaner läuft aktuell auf:

- **Frontend:** Vercel (Next.js)
- **Backend:** Supabase Cloud (PostgreSQL, Auth, Realtime)
- **Cron-Jobs** (laut `vercel.json`):

```
/api/cron/dunning         → 0 8 * * *  (täglich 08:00 Uhr)
/api/cron/mark-overdue     → 0 9 * * *  (täglich 09:00 Uhr)
/api/cron/recurring-inv    → 0 7 1 * *   (monatlich am 1., 07:00 Uhr)
```

---

## 2. Vercel — Optionen und Grenzen

### 2.1 Vercel Hobby (kostenlos)

| Limit | Wert | Problem für ReinPlaner |
|---|---|---|
| Cron-Jobs | 1×/Tag (hard limit) | 🔴 3 verschiedene Crons — überschreitet Limit |
| Build-Minuten | 6.000/Monat | 🟢 Ausreichend |
| Bandbreite | 100GB/Monat | 🟢 Ausreichend |
| Serverless Functions | 100h/Monat | 🟡 Ausreichend |

**Fazit Hobby:** Die 3 Cron-Jobs überschreiten das 1×/Tag-Limit. **Hobby ist nicht nutzbar** mit dem aktuellen Cron-Setup.

### 2.2 Vercel Pro ($20/Monat pro User)

Laut aktueller Vercel-Dokumentation (2026):

- **$20 pro User/Monat** (nicht pro Projekt!)
- 100GB Bandbreite inkl.
- **Unbegrenzte Cron-Jobs** ✅
- Mehr Build-Minuten, schnellere Serverless-Edge-Runtime
- Serverless Functions: 10.000h/Monat

**Kostenbeispiel (Team mit 2 Entwicklern):**

```
2 × $20 = $40/Monat Basis
+ Supabase Pro ~$90/Monat
= ~$130/Monat
```

**Vorteile Vercel Pro:**
- Sofort einsatzbereit — keine Infrastruktur-Änderungen
- Edge Functions, globale CDNs
- Einfaches Preview-Deployment pro Branch
- Out-of-the-box SSL, DDoS-Schutz

**Nachteile:**
- $20/User/Monat ist teuer für kleine Teams
- Vendor Lock-In nimmt zu
- Bandbreiten-Overage können Kosten treiben

### 2.3 Vercel Cron-Limit — Detailanalyse

Vercel erlaubt auf Hobby nur **1 Cron pro Projekt pro Tag**. ReinPlaner hat **3 Crons** mit unterschiedlichen Schedules:

- **Dunning** (täglich): Erinnert an überfällige Rechnungen
- **Mark-Overdue-Shifts** (täglich): Setzt Schichten auf "overdue"
- **Recurring-Invoices** (monatlich): Generiert wiederkehrende Rechnungen

Lösungsmöglichkeiten:

1. **Pro-Plan** — alle 3 Crons frei nutzbar
2. **Dunning + Overdue-Shifts in einen kombinierten Cron** zusammenfassen → 2 Crons, immer noch nicht 1×
3. **External Cron Service** (z.B. GitHub Actions,cron-job.org) → Umgeht Vercel-Limit komplett

**Empfehlung:** Für MVP reicht Vercel Pro ($20/User). Später lohnt sich der Umstieg.

---

## 3. Coolify + Hetzner — Die OSS-Alternative

### 3.1 Was ist Coolify?

Coolify ist eine **Open-Source, selbst-hostbare Platform as a Service (PaaS)**. Es ersetzt Vercel/Railway/Render mit einem eigenen VPS.

**Funktionen:**
- GitHub-Integration (Push-to-Deploy)
- Automatisches SSL/TLS (Let's Encrypt)
- Docker-basierte Deployments
- Database-as-a-Service integriert (PostgreSQL, MySQL, Redis, etc.)
- Docker Compose Support
- Single Sign-On (Enterprise)

### 3.2 Coolify — Server-Anforderungen

| Komponente | Minimal | Empfohlen |
|---|---|---|
| RAM | 2 GB | 4 GB |
| vCPUs | 2 | 4 |
| Disk | 20 GB | 40 GB |
| Docker | Ja | Ja |

Für Coolify selbst (Hosting-Plattform) + 1-2 Next.js Apps + PostgreSQL: **CX22 reicht aus**.

### 3.3 Hetzner Cloud — Preise (Stand Mai 2026, DE/FI Regionen)

| Server | vCPUs | RAM | Disk | Preis/Monat |
|---|---|---|---|---|
| **CX22** | 2 | 4 GB | 40 GB | **€3.89** |
| CX32 | 4 | 8 GB | 80 GB | €7.49 |
| CX42 | 8 | 16 GB | 160 GB | €16.40 |
| CAX11 | 2 (ARM) | 4 GB | 50 GB | €3.99 |
| CAX21 | 4 (ARM) | 8 GB | 100 GB | €7.49 |

**Hetzner inklusive:**
- 20–60 TB Traffic (je nach Server)
- IPv4 + IPv6
- DDoS-Schutz
- Firewall
- KEINE Overage-Kosten für Traffic (im Gegensatz zu Vercel/AWS)

### 3.4 Coolify + Hetzner Setup — Schritte

```
1. Hetzner Cloud Server erstellen (CX22, €3.89/Monat)
2. SSH-Key hinterlegen
3. Coolify Install-Script ausführen:
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
4. Coolify Web UI öffnen (Port 3000)
5. GitHub Repo verbinden
6. Next.js App deployen (Docker)
7. Supabase self-hosted ODER externe Supabase Cloud verbinden
```

**Wichtig:** Coolify installiert sich selbst als Docker-Container auf dem Server. Danach verwaltet Coolify alle weiteren Apps/DBs über sein Web UI.

### 3.5 Coolify + Hetzner vs. Vercel Pro — Kostenvergleich

| | Vercel Pro | Coolify + Hetzner |
|---|---|---|
| Compute | $20/User (~2 User = $40) | €3.89 (CX22) |
| Supabase Cloud | ~$90/Monat | ~$90 (oder self-hosted) |
| Domain/SSL | Inkl. | Inkl. |
| DDoS-Schutz | Inkl. | Inkl. (Hetzner) |
| Cron-Jobs | Unbegrenzt (Pro) | Unbegrenzt |
| **Gesamt/Monat** | **~$130-150** | **~$95-130** |

**Einsparung:** ~$30-50/Monat gegenüber Vercel + Supabase Cloud.

---

## 4. Supabase — Cloud vs. Self-Hosted

### 4.1 Supabase Cloud — Kosten

| Plan | Preis | Enthalten |
|---|---|---|
| Free | $0 | 500MB DB, 1GB Storage, 50k MAU |
| Pro | $25/Monat + Compute | 8GB DB, 100k MAU, $60 Compute (Medium) |

**Kosten bei 10k Nutzern, 100 Tenants:**

```
Supabase Pro:        $25/Monat
Compute Medium:      $60/Monat
DB Storage (~50GB): ~$5/Monat Overage
--------------------
Gesamt:              ~$90/Monat
```

### 4.2 Self-Hosted Supabase — Anforderungen

Supabase als Docker-Stack auf eigenem Server:

| Komponente | Minimal | Produktion |
|---|---|---|
| RAM | 4 GB | 8–16 GB |
| vCPUs | 2 | 4 |
| Disk | 20 GB | 50+ GB (nvme) |

**Docker-Images die laufen:**

```
supabase/postgres          # PostgreSQL
postgrest/postgrest        # REST API
kong/kong-gateway          # API Gateway
supabase/gotrue            # Auth
supabase/realtime          # Realtime (Phoenix)
studio:8000                # Admin UI (optional)
```

**Empfohlene Server-Konfiguration für ReinPlaner:**

- **Alleinstehend (Coolify + Supabase auf einem Server):** CX32 (8 GB RAM, 4 vCPU) → **€7.49/Monat**
- **Getrennt (Coolify + Supabase各有自己的服务器):** 2× CX22 → **2 × €3.89 = €7.78/Monat**

### 4.3 Self-Hosted Supabase — Upgrade-Pfad

```
Phase 1 (jetzt):        Supabase Cloud Pro ~$90/Monat
                        → Schnell, kein DevOps
                        
Phase 2 (bei ~500+ Tenants): Coolify + Self-hosted Supabase
                        → €7.49/Monat (Hetzner) + Wartung
                        → Wartungsaufwand: ~5-10h/Monat
                        
Phase 3 (für Kunden):   Docker Compose Template
                        → Kunden hosten selbst auf eigenem VPS
```

---

## 5. Docker Compose — Self-Hosting für Kunden

### 5.1 Konzept

ReinPlaner als **selbst-hostbare Lösung** anbieten. Kunden installieren auf ihrem eigenen VPS (Hetzner, Contabo, etc.).

### 5.2 Was wird gebraucht?

```
reinplaner/
├── docker-compose.yml        # Hauptstack
├── .env.example              # Umgebungsvariablen (Template)
├── install.sh                # One-Click Installations-Script
├── backup.sh                 # Backup-Script
└── docs/
    └── SELF-HOSTING.md       # Anleitung
```

### 5.3 .env Template (kritische Variablen)

```bash
# ===========================
# ReinPlaner Environment
# ===========================

# Supabase (oder eigene Instanz)
NEXT_PUBLIC_SUPABASE_URL=https://ihre-supabase-url.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Domain
NEXT_PUBLIC_APP_URL=https://reinplaner.ihrefirma.de

# Auth (SMTP für Magic Links)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=xxxxx
SMTP_FROM="ReinPlaner <noreply@example.com>"
```

### 5.4 Installations-Script (skizziert)

```bash
#!/bin/bash
set -e

echo "🛠️  ReinPlaner Installer"

# 1. System-Check
if ! command -v docker &> /dev/null; then
    echo "❌ Docker nicht gefunden. Installation..."
    curl -fsSL https://get.docker.com | sh
fi

# 2. Verzeichnis erstellen
mkdir -p /opt/reinplaner
cd /opt/reinplaner

# 3. docker-compose.yml herunterladen
curl -O https://reinplaner.example.com/docker-compose.yml
curl -O https://reinplaner.example.com/.env.example

# 4. .env konfigurieren
cp .env.example .env
nano .env  # Manuell bearbeiten

# 5. Starten
docker-compose up -d

# 6. Health-Check
echo "✅ Installation abgeschlossen!"
echo "📍 Web UI: http://$(hostname -I):3000"
```

### 5.5 Support-Aufwand — Schätzung

| Aspekt | Aufwand |
|---|---|
| Initiale Setup-Hilfe | 1-2h pro Kunde |
| Update-Einspielen (Docker Compose) | ~30min/Monat |
| Backup-Recovery | Selten, ~1-2h wenn nötig |
| Troubleshooting | Variabel |

**Empfehlung:** Self-Hosting nur für technisch versierte Kunden anbieten. Für Nicht-Techniker: Managed SaaS.

---

## 6. Kostenvergleich — Gesamtübersicht

### Szenario A: Vercel + Supabase Cloud (aktuell)

| Dienst | Kosten/Monat |
|---|---|
| Vercel Pro (2 User) | $40 |
| Supabase Pro + Compute | $90 |
| **Gesamt** | **~$130/Monat** |

### Szenario B: Coolify + Hetzner + Supabase Cloud

| Dienst | Kosten/Monat |
|---|---|
| Hetzner CX22 (Coolify Host) | €3.89 |
| Hetzner CX22 (Supabase self-hosted) | €3.89 |
| Domains, SSL | $0 |
| **Gesamt** | **~$10-15/Monat** (ohne Supabase Cloud) |

### Szenario C: Coolify + Hetzner + Self-hosted Supabase

| Dienst | Kosten/Monat |
|---|---|
| Hetzner CX32 (4 GB RAM, 4 vCPU) | €7.49 |
| Supabase self-hosted (Docker) | inklusive |
| Backup Storage (~100GB) | €5-10 |
| **Gesamt** | **€12-20/Monat** |

### Szenario D: Self-Hosted für Kunden (On-Premise)

Kunde betreibt auf eigenem Hetzner-Server (€3.89-7.49/Monat). ReinPlaner GmbH liefert nur Docker Images + Support.

---

## 7. Phasen-Plan — Evolutive Migration

### Phase 1: Jetzt (MVP, < 100 Tenants)

```
Vercel Hobby → Vercel Pro (Cron-Problem lösen)
Supabase Cloud Pro
Kosten: ~$130/Monat
```

**Priorität:** Vercel Pro buchen (sonst funktionieren Crons nicht).

### Phase 2: Wachstum (100-500 Tenants)

```
Vercel Pro → Coolify + Hetzner
Supabase Cloud → Self-hosted Supabase auf separatem Server
Kosten: €10-20/Monat
```

**Aufwand:** ~2-3 Tage Migration, inkl. Testing.

### Phase 3: Enterprise (Kunden-self-hosting)

```
ReinPlaner als Docker Compose Template
Kunden deployen auf eigenem VPS
Support-Vertrag optional
```

**Vorteil:** Skaliert ohne eigene Infrastruktur.

---

## 8. Empfehlung

### Für Muris (kleines SaaS, später Self-Hosting für Kunden):

**Empfohlener Pfad:**

```
Jetzt:        Vercel Pro + Supabase Cloud Pro
              → $130/Monat, funktioniert sofort
              → Cron-Limit gelöst
              → Keine DevOps-Belastung

6-12 Monate:  Coolify + Hetzner (Frontend)
              + Self-hosted Supabase auf Hetzner CX32
              → ~€15-20/Monat
              → 80% Kostenreduktion
              
Langfristig:  Docker Compose Template für Kunden
              → Self-Hosting Angebot
              → Support-Verträge als Revenue-Stream
```

**Begründung:**

1. **Vercel Pro jetzt:** Die 3 Cron-Jobs erfordern es. Ohne Pro funktioniert Dunning/Overdue-Shifts nicht täglich.
2. **Coolify + Hetzner später:** Reife Open-Source-Alternative. Kostenersparnis ~$110/Monat.
3. **Self-hosted Supabase:** docker-compose.yml existiert bereits (aus lokaler Entwicklung). Gleiche Images für Produktion.
4. **Kunden-Self-Hosting:** Für B2B-Kunden mit eigenen IT-Ressourcen attraktiv (DSGVO, Datenhoheit).

**Nicht empfohlen:**

- **Hobby-Plan behalten** — Cron-Limit ist Dealbreaker
- **Jetzt komplett self-hosted** —过早 für MVP, erhöht Komplexität ohne Nutzen
- **Railway/Render** — Ähnlich wie Vercel, teurer als Coolify+Hetzner

---

## 9. Quick-Start: Coolify + Hetzner (wenn gewünscht)

Falls Migration gewünscht:

```
1. Hetzner Cloud Account erstellen (htzns.de/cb)
2. CX22 Server (€3.89) in Frankfurt bestellen
3. Ubuntu 22.04 LTS auswählen
4. Coolify installieren:
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
5. Coolify UI öffnen (https://server-ip:3000)
6. GitHub Repo verbinden
7. Next.js App als "Application" hinzufügen
8. Environment Variables aus Vercel kopieren
9. Deploy klicken ✅
```

**Zeitschätzung:** 2-4 Stunden Ersteinrichtung.