# ReinPlaner Architektur-Migration: Supabase → Drizzle ORM + NextAuth.js + API-First

> **Status:** In Planung | **Datum:** 2025-05-19 | **Projekt:** ReinPlaner

---

## Ausgangslage

Supabase Self-Hosted bereitet auf Coolify erhebliche Probleme:
- 14 separate Services (Kong, Gotrue, PostgREST, Storage, Realtime, Studio...) → zu komplex
- Traefik/Caddy-Routing-Konflikte mit Coolify Proxy
- Multi-Tenant-Isolation über RLS auf Coolify kaum wartbar
- Gotrue-Migrationsproblem: `auth`-Schema muss manuell existieren

**Supabase-Nutzung in ReinPlaner (vereinfacht):**
- ✅ Auth (signIn, signOut, getUser, onAuthStateChange)
- ✅ Database CRUD (profiles, employees, orders, shifts, invoices...)
- ✅ RPC Calls (5 Stück: generate_invoice_number, get_todays_orders_optimized...)
- ❌ Realtime (nicht genutzt)
- ❌ Storage (nicht genutzt)

---

## Ziel-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        COOLIFY                               │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │  dev.reinplaner  │    │    prod.reinplaner          │    │
│  │  (Next.js)       │    │    (Next.js)                │    │
│  └────────┬─────────┘    └─────────────┬──────────────┘    │
│           │                            │                     │
│           │         ┌───────────────────┘                     │
│           │         │                                         │
│           ▼         ▼                                         │
│  ┌─────────────────────────────┐                            │
│  │  PostgreSQL 16 (coolify-db) │                            │
│  │  Multi-Tenant mit Drizzle   │                            │
│  └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** Next.js 16 (Coolify) ✅ bleibt
- **Auth:** NextAuth.js v5 (JWT-Sessions, Credential-Auth + Email/Password)
- **ORM/DB Layer:** Drizzle ORM mit PostgreSQL (coolify-db)
- **API:** Next.js Route Handlers (App Router API Routes)
- **API-Dokumentation:** tsoa (OpenAPI/Swagger aus TypeScript Decorators)
- **E-Mail:** Resend (bereits in use)
- **Deployment:** Coolify (dev + prod als separate Apps)

---

## Warum diese Architektur?

| Kriterium | Supabase (aktuell) | Drizzle + NextAuth (neu) |
|-----------|-------------------|------------------------|
| Maintenance | 14 Services, komplex | 1 DB + App Code |
| Coolify-Integration | Problematisch | Native |
| Multi-Tenant | RLS (fragil) | Drizzle WHERE clauses (robust) |
| API-Dokumentation | Nicht vorhanden | Swagger UI + OpenAPI 3.0 |
| Skalierung | Enterprise-Support nötig | PostgreSQL-Cluster möglich |
| Kosten | Server-Resourcen hoch | Gering (nur DB) |
| Kontrolle | Kong/Gotrue/PostgREST | Volle Kontrolle |
| Enterprise-Features | Eingebaut | Self-implemented |
| ORM | - | Drizzle (leicht, typisiert, SQL-nah) |

---

## Migration Phasen (Kanban)

### Kanban Board: ReinPlaner Backend Migration

#### 📋 Phase 0: Planung & Decision (a1)
**Tasks:**
- [ ] **a1.1:** Decision: Drizzle als ORM + NextAuth als Auth-Layer ✅ ANALYSIERT
- [ ] **a1.2:** API-First Design + tsoa entschieden
- [ ] **a1.3:** Coolify-Setup für 2 Environments (dev + prod) planen

---

#### 🔒 Phase 1: Backup & Dokumentation (a2)
**Tasks:**
- [ ] **a2.1:** PostgreSQL-Dump der aktuellen DB erstellen
- [ ] **a2.2:** Alle `NEXT_PUBLIC_SUPABASE_*` ENV-Variablen dokumentieren
- [ ] **a2.3:** Alle Supabase-Client-Aufrufe in Dateien inventarisieren
- [ ] **a2.4:** ENV-Vorlage für dev/prod erstellen (.env.example)

---

#### 🗄️ Phase 2: Drizzle Schema (a3)
**Tasks:**
- [x] **a3.1:** `drizzle-orm` + `drizzle-kit` im Projekt installieren ✅
- [x] **a3.2:** Schema aus bestehender DB generieren ✅ (schema.ts existiert)
- [ ] **a3.3:** Multi-Tenant-Felder prüfen (`tenant_id` in allen Tabellen)
- [ ] **a3.4:** Drizzle Schema bereinigen (unnötige Views/Tabellen)
- [ ] **a3.5:** Migrations-Basis erstellen (`drizzle-kit generate`)

---

#### 📡 Phase 3: API-First Design + OpenAPI/Swagger (a4)
**Tasks:**
- [ ] **a4.1:** `tsoa` installieren (`npm install tsoa`)
- [ ] **a4.2:** `tsoa.json` Config erstellen (OpenAPI 3.0, swagger-ui)
- [ ] **a4.3:** Route Handler in `src/app/api/` als OpenAPI-Spec dokumentieren
- [ ] **a4.4:** Auth-Endpoints deklarieren (Login, Logout, Session, Register)
- [ ] **a4.5:** CRUD-Endpoints für alle Entitäten deklarieren (employees, orders, shifts, invoices, profiles)
- [ ] **a4.6:** RPC/Action-Endpoints deklarieren
- [ ] **a4.7:** Request/Response-Types als TypeScript-Interfaces oder Zod-Schema
- [ ] **a4.8:** API-Versionierung vorbereiten (`/api/v1/`)
- [ ] **a4.9:** `npm run swagger` Script hinzufügen
- [ ] **a4.10:** Swagger-UI Route erstellen (`/docs`)

**tsoa Setup:**
```bash
npm install tsoa
```
`tsoa.json`:
```json
{
  "entryFile": "./src/app/api/swagger.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "specVersion": 3,
  "specPath": "./src/app/api/openapi.json",
  "swagger": true,
  "routes": "./src/app/api/routes.ts"
}
```

---

#### 🔐 Phase 4: NextAuth.js Integration (a5)
**Tasks:**
- [ ] **a5.1:** `next-auth` v5 (`npm install next-auth@beta`) installieren
- [ ] **a5.2:** `src/lib/auth/options.ts` — Auth-Provider konfigurieren (Credentials + Email/Password)
- [ ] **a5.3:** JWT-Strategy konfigurieren
- [ ] **a5.4:** `src/lib/auth/session.ts` — `getServerSession()` erstellen
- [ ] **a5.5:** `src/app/api/auth/[...nextauth]/route.ts` — NextAuth Route Handler
- [ ] **a5.6:** Middleware für Auth-Protection anpassen (`src/middleware.ts`)
- [ ] **a5.7:** Login-Page an NextAuth anpassen (bestehende `login/page.tsx`)
- [ ] **a5.8:** Tenant-Extraction in Session behalten

---

#### 🗄️ Phase 5: Database Layer Migration (a6)
**Tasks:**
- [ ] **a6.1:** `src/lib/db/index.ts` — Drizzle-Client erstellen
- [ ] **a6.2:** `src/lib/supabase/server.ts` → `src/lib/auth/session.ts` migrieren
- [ ] **a6.3:** `src/lib/supabase/client.ts` → `src/lib/db/client.ts` migrieren
- [ ] **a6.4:** Alle Actions migrieren (`src/lib/actions/*.ts`)
- [ ] **a6.5:** Alle Services migrieren (`src/lib/services-*.ts`)
- [ ] **a6.6:** RPC-Calls durch Drizzle-Queries ersetzen
- [ ] **a6.7:** Admin-Client durch Drizzle-Service-Account ersetzen

---

#### 🔄 Phase 6: Middleware + Supabase-Client Ersetzung (a7)
**Tasks:**
- [ ] **a7.1:** `src/middleware.ts` von Supabase-Middleware auf NextAuth-Middleware migrieren
- [ ] **a7.2:** `src/lib/supabase/middleware.ts` löschen/entfernen
- [ ] **a7.3:** `src/app/auth/callback/route.ts` → NextAuth-Callback-Handler
- [ ] **a7.4:** Session-Cookies umstellen (Supabase → NextAuth)
- [ ] **a7.5:** Tenant-Extraction in Middleware behalten

---

#### 🧪 Phase 7: Test & Build (a8)
**Tasks:**
- [ ] **a8.1:** `npm run build` — Build durchlaufen
- [ ] **a8.2:** Login/Logout testen
- [ ] **a8.3:** Dashboard-Zugriff testen
- [ ] **a8.4:** Employee-Portal testen
- [ ] **a8.5:** API-Routes testen (alle `/api/v1/` Endpoints)
- [ ] **a8.6:** Swagger `/docs` testen — alle Endpoints dokumentiert?
- [ ] **a8.7:** Impersonation testen (falls vorhanden)
- [ ] **a8.8:** Alle Actions/Queries mit Test-Tenant durchspielen

---

#### 🚀 Phase 8: Coolify Prod Environment (a9)
**Tasks:**
- [ ] **a9.1:** Coolify neue App für prod (falls separate Domain)
- [ ] **a9.2:** prod-ENV-Variablen in Coolify konfigurieren
- [ ] **a9.3:** Datenbank-Migration auf Prod-DB
- [ ] **a9.4:** Build auf Prod-Deployment
- [ ] **a9.5:** Smoke-Tests auf prod

---

#### 📦 Phase 9: Daten-Migration + Cutover (a10)
**Tasks:**
- [ ] **a10.1:** Prod-DB-Backup erstellen
- [ ] **a10.2:** Auth-User-Migration (email→NextAuth-hashed-passwords)
- [ ] **a10.3:** DNS-Cutover (falls nötig)
- [ ] **a10.4:** Monitoring + Alerts prüfen

---

#### 🧹 Phase 10: Aufräumen (a11)
**Tasks:**
- [ ] **a11.1:** Supabase-Container stoppen/entfernen
- [ ] **a11.2:** Caddy-Kong-Routing-Config entfernen
- [ ] **a11.3:** Nicht mehr benötigte ENV-Variablen entfernen
- [ ] **a11.4:** Alte `src/lib/supabase/` Dateien entfernen
- [ ] **a11.5:** `docker-compose.supabase.yml` archivieren/löschen

---

## Abhängigkeiten

```
a2 (Backup) ──────────────────────────────────────────────► a10 (Cutover)
                                                            │
a3 (Drizzle) ───► a4 (API-First) ───► a5 (NextAuth) ──┐   │
                                                         │   │
a6 (DB Layer) ──► a7 (Middleware) ──► a8 (Test) ──► a9 (Prod) ──┘
                                                            │
a11 (Cleanup) ◄─────────────────────────────────────────────┘
```

---

## Env-Variablen (neu)

```env
# Database (Drizzle)
DATABASE_URL="postgresql://coolify:@coolify-db:5432/reinplaner"

# NextAuth
NEXTAUTH_URL="https://dev.reinplaner.de"
NEXTAUTH_SECRET="[generiert]"
AUTH_SECRET="[generiert]"

# tsoa (OpenAPI)
OPENAPI_JSON_URL="/api/openapi.json"

# Keine SUPABASE_URL / SUPABASE_KEY mehr nötig
```

---

## Dateien die angelegt/geändert werden

**Neu:**
- `src/lib/db/index.ts` (Drizzle client)
- `src/lib/db/schema.ts` (existiert bereits ✅)
- `src/lib/auth/options.ts` (NextAuth config)
- `src/lib/auth/session.ts` (Session helpers)
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/swagger.ts` (tsoa entry)
- `src/app/docs/page.tsx` (Swagger UI)
- `src/middleware.ts` (angepasst)
- `drizzle.config.ts` (existiert bereits ✅)
- `tsoa.json`

**Geändert:**
- `src/lib/actions/*.ts` (~20 Dateien)
- `src/lib/services-*.ts` (~5 Dateien)
- `src/app/auth/callback/route.ts`
- `package.json` (+ next-auth@beta, tsoa)
- `.env` / `.env.example`

**Gelöscht (nach Migration):**
- `src/lib/supabase/` (client.ts, server.ts, middleware.ts)
- `docker-compose.supabase.yml`
- `infrastructure/supabase/` (wenn nicht mehr benötigt)

---

## Risiken & Mitigations

| Risiko | Mitigation |
|--------|------------|
| Auth-Migration: User-Passwörter | Erst Hashes migrieren, dann Reset-Flow |
| Multi-Tenant RLS → WHERE | Code-Audit nach Migration |
| NextAuth-Session-Timeouts | Testen mit echten Sessions |
| Produktions-Data-Loss | Full DB-Backup vor jedem Schritt |
| Coolify Prod-Setup | dev.zuerst komplett testen |
| tsoa + Next.js App Router | tsoa v6 unterstützt App Router |
| API-Breaking Changes | Versionierung (`/api/v1/`) von Anfang an |

---

## Zeit-Schätzung

| Phase | Aufwand |
|-------|---------|
| Phase 1 (Backup) | 1h |
| Phase 2 (Drizzle) | 1h (bereits teilweise fertig) |
| Phase 3 (API-First/tsoa) | 2-3h |
| Phase 4 (NextAuth) | 2-3h |
| Phase 5 (DB Layer) | 4-8h |
| Phase 6 (Middleware) | 1-2h |
| Phase 7 (Test) | 2-3h |
| Phase 8 (Coolify Prod) | 2h |
| Phase 9 (Cutover) | 1-2h |
| Phase 10 (Cleanup) | 1h |
| **Gesamt** | **17-26h** |