# Coolify Deployment Pipeline – ReinPlaner

## Übersicht

| Environment | Branch | URL | Beschreibung |
|---|---|---|---|
| **Production** | `master` | https://reinplaner.de | Dummy/Coming-Soon Page |
| **Development** | `dev` | https://dev.reinplaner.de | Vollständige App |

---

## 1. Coolify Installation (Linux Server mit Docker)

### Voraussetzungen
- Linux-Server (Ubuntu 22.04/24.04 empfohlen)
- Docker & Docker Compose installiert
- 48 GB RAM, 32 Kerne (laut Server-Spezifikation)
- Domain/subdomain DNS bereits auf Server-IP zeigen

### Installation via Script

```bash
# Als Root oder mit sudo
curl -fsSL https://get.coolify.io | sudo bash

# Oder mit特定 Version
curl -fsSL https://get.coolify.io | sudo bash -s -- --version 2025.01.1
```

### Nach Installation
1. Coolify ist erreichbar unter `http://<SERVER_IP>:3000` (erster Start)
2. Beim ersten Zugriff: Admin-Account erstellen
3. **Wichtig:** Unter Settings → "Let's Encrypt" aktivieren für HTTPS

### Docker Network prüfen
```bash
docker network ls
# Stelle sicher, dass Coolify ein Netzwerk erstellt hat (z.B. coolify)
```

---

## 2. GitHub Repository verbinden

### In Coolify:
1. **New Project** erstellen → Name: `ReinPlaner`
2. **Add Source** → GitHub auswählen
3. **OAuth App** registrieren (in GitHub → Settings → Developer settings):
   - Homepage URL: `https://coolify.installation.domain`
   - Callback URL: `https://coolify.installation.domain/github`
4. Token in Coolify eintragen
5. Repository auswählen: **muri72/ReinPlaner**

### Alternative: GitHub Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. Scope: `repo` (Full repository), `read:org`
3. In Coolify: Source hinzufügen → "GitHub (Personal Access Token)"
4. Token eintragen → Repository `muri72/ReinPlaner` auswählen

---

## 3. Deployment Configuration

### 3.1 Production (master → reinplaner.de)

```
Project: ReinPlaner
Environment: Production
Git Branch: master
Build Pack: Dockerfile
Domain: reinplaner.de
Port: 3000
HTTPS: Enabled (Let's Encrypt)
```

**Environment Variables (Production):**
```
NEXT_PUBLIC_SUPABASE_URL=<aus .env.production.template>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<aus .env.production.template>
SUPABASE_SERVICE_ROLE_KEY=<aus .env.production.template>
NEXT_PUBLIC_SENTRY_DSN=<aus .env.production.template>
SENTRY_DSN=<aus .env.production.template>
SENTRY_AUTH_TOKEN=<aus .env.production.template>
RESEND_API_KEY=<aus .env.production.template>
CRON_API_KEY=<aus .env.production.template>
NEXT_PUBLIC_BASE_URL=https://reinplaner.de
NODE_ENV=production
```

### 3.2 Development (dev → dev.reinplaner.de)

```
Project: ReinPlaner
Environment: Development
Git Branch: dev
Build Pack: Dockerfile
Domain: dev.reinplaner.de
Port: 3000
HTTPS: Enabled (Let's Encrypt)
```

**Environment Variables (Development):**
```
NEXT_PUBLIC_SUPABASE_URL=<aus .env.production.template>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<aus .env.production.template>
SUPABASE_SERVICE_ROLE_KEY=<aus .env.production.template>
NEXT_PUBLIC_SENTRY_DSN=<aus .env.production.template>
SENTRY_DSN=<aus .env.production.template>
SENTRY_AUTH_TOKEN=<aus .env.production.template>
RESEND_API_KEY=<aus .env.production.template>
CRON_API_KEY=<aus .env.production.template>
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de
NODE_ENV=production
```

---

## 4. Dockerfile-basierter Build

Das Repository enthält bereits ein produktionsfertiges Dockerfile (`Dockerfile`):

### Dockerfile-Aufbau (Zusammenfassung)
- **Base Image:** `node:22-alpine`
- **3-Stage Build:**
  1. `deps`: Abhängigkeiten installieren (pnpm)
  2. `builder`: Next.js Build mit `pnpm build`
  3. `runner`: Minimaler Runtime-Container mit `node:22-alpine`
- **Port:** 3000
- **User:** Non-root (`nextjs`)
- **Healthcheck:** `http://localhost:3000/health`

### Coolify Configuration
```yaml
Build Pack: Dockerfile
Dockerfile Location: ./Dockerfile (Standard)
```

### Wichtige Env-Vars für Build
```bash
NEXT_TELEMETRY_DISABLED=1    # Deaktiviert Telemetrie
DOCKER_BUILD=true            # Build-Flag
NODE_ENV=production
```

---

## 5. Cron-Job Alternative zu Vercel

### Problem
Vercel bietet Cron-Jobs über `vercel.json`. Coolify hat keine native Cron-Unterstützung wie Vercel.

### Lösung 1: BullMQ (Empfohlen)

Vorteile:
- Persistent队列 in Redis
- Kann auf demselben Server laufen
- Flexible Zeitplanung
- Robust bei Server-Neustarts

**Setup:**

1. **Redis hinzufügen** (in Coolify):
   - New Resource → Database → Redis
   - oder Docker Compose mit Redis-Container

2. **Environment Variables erweitern:**
   ```env
   REDIS_URL=redis://<redis-host>:6379
   ```

3. **Worker konfigurieren** (neuer Coolify Service):
   ```yaml
   Type: Application
   Git Branch: master
   Build Pack: Dockerfile
   Command Override: node worker.js
   # oder eigener Cron-Worker
   ```

4. **BullMQ Queue definieren:**
   ```javascript
   import { Queue } from 'bullmq';
   
   const dailyTasksQueue = new Queue('daily-tasks', {
     connection: { url: process.env.REDIS_URL }
   });
   
   // Scheduler/Cron im Worker
   // Alternativ: node-cron oder node-schedule
   ```

### Lösung 2: Coolify Persistent Container + Node-Cron

Vorteil: Kein zusätzliches Redis nötig

1. **Eigenen Cron-Container erstellen** (`cron/Dockerfile`):
   ```dockerfile
   FROM node:22-alpine
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile
   COPY . .
   CMD ["node", "cron/scheduler.js"]
   ```

2. **In Coolify deployen:**
   - Separater Service für Cron
   - Healthcheck auf Port 3001 oder ohne HTTP-Healthcheck

3. **Scheduler im Code:**
   ```javascript
   // cron/scheduler.js
   import cron from 'node-cron';
   
   cron.schedule('0 9 * * *', async () => {
     console.log('Running daily tasks cron...');
     // Fetch: https://reinplaner.de/api/cron/daily-tasks?key=${CRON_API_KEY}
   });
   ```

### Lösung 3: Externer Cron-Service (Einfachste Lösung)

Services wie **cron-job.org** oder **EasyCron**:
- Registrieren
- URL eintragen: `https://reinplaner.de/api/cron/daily-tasks?key=YOUR_CRON_API_KEY`
- Zeitplan: `0 9 * * *`

**Vorteil:** Kein Server-Resonanz-Problem
**Nachteil:** Externer Service, Datenschutz

### API-Endpunkt absichern

In `pages/api/cron/daily-tasks.ts` oder `app/api/cron/daily-tasks/route.ts`:
```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (key !== process.env.CRON_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... Cron-Logik
}
```

---

## 6. Dummy/Coming-Soon Page auf master

### Warum eine Dummy Page?
Bis die vollständige Anwendung produktionsreif ist, soll `reinplaner.de` eine statische Coming-Soon-Seite anzeigen.

### Option A: Separate Coolify Application (Empfohlen)

1. **Neues Projekt "ReinPlaner Static"** oder als Resource im bestehenden Projekt

2. **Statische Dateien vorbereiten:**
   ```bash
   mkdir -p coming-soon
   # index.html, styles.css, ggf. ein Logo
   ```

3. **Mit Docker Compose oder eigenem Dockerfile:**
   ```dockerfile
   # coming-soon/Dockerfile
   FROM nginx:alpine
   COPY . /usr/share/nginx/html
   EXPOSE 80
   ```

4. **In Coolify deployen:**
   ```
   Type: Application
   Repository: (same or simple static repo)
   Branch: master
   Build Pack: Dockerfile
   Domain: reinplaner.de
   Port: 80
   ```

### Option B: Reverse Proxy Routing

Coolify's **Traefik**-Integration nutzen:

1. **dev.reinplaner.de** → Vollständige App (Port 3000)
2. **reinplaner.de** → Separate Coming-Soon-Page (Port 80)

**Konfiguration in Coolify:**
- Für `reinplaner.de`: Anderes Repository oder Docker Compose mit beiden Services
- Traefik Labels setzen:
   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.coming-soon.rule=Host(`reinplaner.de`)"
     - "traefik.http.routers.coming-soon.entrypoints=websecure"
     - "traefik.http.routers.coming-soon.tls=true"
   ```

### Option C: Next.js Route für `/` (Wenn App bereits läuft)

Falls master bereits die App enthält, aber eine spezielle Page zeigen soll:

1. **Coming-Soon-Komponente erstellen:**
   ```tsx
   // app/coming-soon/page.tsx
   export default function ComingSoon() {
     return (
       <div style={{ textAlign: 'center', padding: '50px' }}>
         <h1>ReinPlaner kommt bald</h1>
         <p>Wir arbeiten hart an der Fertigstellung.</p>
       </div>
     );
   }
   ```

2. **Mittels `next.config.js` umleiten:**
   ```js
   module.exports = {
     async redirects() {
       return [
         { source: '/', destination: '/coming-soon', permanent: false }
       ];
     }
   };
   ```

### Schnellste Umsetzung (Empfohlen)

Für eine **sofortige Coming-Soon-Seite**:

1. **Nginx-Container in Coolify als eigene Resource** deployen
2. **Domain:** `reinplaner.de` → Port 80
3. **HTML-Datei:**
   ```html
   <!DOCTYPE html>
   <html lang="de">
   <head>
     <meta charset="UTF-8">
     <title>ReinPlaner - Coming Soon</title>
     <style>
       body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
       .container { text-align: center; }
     </style>
   </head>
   <body>
     <div class="container">
       <h1>🚧 ReinPlaner</h1>
       <p>Coming Soon – Wir arbeiten hart an der Fertigstellung.</p>
     </div>
   </body>
   </html>
   ```

4. **Für dev.reinplaner.de:** Normale Next.js App deployen

---

## Quick-Start Checklist

- [ ] Coolify auf Server installiert (`curl -fsSL https://get.coolify.io | sudo bash`)
- [ ] Admin-Account erstellt, Let's Encrypt aktiviert
- [ ] GitHub Source verbunden (muri72/ReinPlaner)
- [ ] Production Environment mit master-Branch → `reinplaner.de`
- [ ] Development Environment mit dev-Branch → `dev.reinplaner.de`
- [ ] Environment Variables aus `.env.production.template` kopiert
- [ ] Dockerfile Build funktioniert
- [ ] DNS für beide Domains zeigt auf Server-IP
- [ ] Cron-Job Lösung implementiert (BullMQ oder extern)
- [ ] Coming-Soon Page für Production deployed

---

## Troubleshooting

### Build schlägt fehl
```bash
# Logs in Coolify UI prüfen
# Oder via CLI:
coolify logs <resource-id>
```

### Port 3000 nicht erreichbar
- Healthcheck-Pfade prüfen
- Firewall-Regeln: `ufw allow 3000` oder via Cloudflare/Provider

### HTTPS funktioniert nicht
- Let's Encrypt in Coolify aktivieren (Settings)
- DNS muss bereits auf Server zeigen
- Zertifikats-Logs prüfen

### Cron läuft nicht
- Cron-Container muss persistent laufen (nicht `once`)
- Logs des Cron-Services prüfen
- API-Key in URL korrekt?
