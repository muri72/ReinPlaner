# Supabase Environment Variables Inventory

> **Erstellt:** Mai 2026
> **Zweck:** Dokumentation aller Supabase-bezogenen ENV-Variablen vor der Migration zu Drizzle ORM + NextAuth.js

---

## 1. Gefundene ENV-Variablen (komplett)

### 1.1 Cloud Supabase (`.env.local` — Development)

| Variable | Wert (Muster) | Verwendet in |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ignrqqicnhlaysqxuejz.supabase.co` | Client, Server, Middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...U8uc` | Client, Server, Middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...SpxI` | Server Admin Client, Impersonation |

### 1.2 Self-Hosted Supabase (`.env` — Local Dev / Infrastructure)

| Variable | Wert (Muster) | Verwendet in |
|---|---|---|
| `POSTGRES_PASSWORD` | `reinplaner_dev_pg_...` | Docker Compose, Postgres |
| `JWT_SECRET` | `6MhiUuDkZ0zE+...` | Supabase Auth (GoTrue) |
| `ANON_KEY` | `QVWM2u2KP+CE...` | Self-hosted API (Kong) |
| `SERVICE_KEY` | `BXDkAKxeRtT8...` | Self-hosted Service Role |
| `API_EXTERNAL_URL` | `http://kong:8000` | Supabase Kong Gateway |
| `SITE_URL` | `https://dev.reinplaner.de` | Supabase Auth Redirects |

### 1.3 Self-Hosted Production (`.env.production`)

| Variable | Wert (Muster) | Verwendet in |
|---|---|---|
| `POSTGRES_PASSWORD` | `GC8eLJlZiQNLMw...` | Docker Compose |
| `JWT_SECRET` | `y2UJfTL7tZ4b_...` | Supabase Auth |
| `ANON_KEY` | `eyJhbG...xcBk` | Self-hosted API |
| `SERVICE_ROLE_KEY` | `eyJhbG...Fe-M` | Server Admin Client |
| `META_ADMIN_TOKEN` | `UApmuPTnZ2ny3...` | Supabase Studio Meta |
| `SUPABASE_STUDIO_URL` | `https://studio.supabase.dev.reinplaner.de` | Studio URL |
| `API_EXTERNAL_URL` | `https://supabase.dev.reinplaner.de` | Kong Gateway |
| `SITE_URL` | `https://dev.reinplaner.de` | Auth Redirects |

### 1.4 Meta-Database Overrides (optional, in `registry.ts`)

| Variable | Fallback | Verwendet in |
|---|---|---|
| `META_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/tenant/registry.ts` |
| `META_SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/tenant/registry.ts` |

---

## 2. Verwendung in Source Code

### Dateien die Supabase ENV referenzieren:

| Datei | Variablen | Zweck |
|---|---|---|
| `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Client (createBrowserClient) |
| `src/lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Server Client + Admin Client |
| `src/lib/supabase/middleware.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SSR Cookie-basiert |
| `src/lib/tenant/registry.ts` | `META_SUPABASE_URL`, `META_SUPABASE_SERVICE_KEY` (optional) | Meta-Tenant-DB |
| `src/lib/actions/impersonation.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Admin Impersonation |
| `src/lib/actions/tenant-admin.ts` | `META_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Tenant Admin Actions |
| `src/middleware.ts` (root) | — (keine Supabase vars, nur CSP) | CSP Header referenziert `*.supabase.co` |

### E2E / Test Dateien:

| Datei | Variablen |
|---|---|
| `e2e/helpers/test-setup.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `e2e/seed-test-data.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `e2e/run-tests.sh` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 3. Migration: Welche Variablen werden NICHT mehr benötigt

### Nach Migration zu Drizzle + NextAuth.js entfernen:

| Variable | Ersetzung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `DATABASE_URL` (direkte Postgres-Verbindung) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Entfällt** (kein Supabase Auth mehr) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Entfällt** (Server-Admin über Drizzle mit DB-Credentials) |
| `ANON_KEY` / `SERVICE_KEY` (self-hosted) | **Entfällt** |
| `JWT_SECRET` (Supabase) | `NEXTAUTH_SECRET` + eigenes JWT |
| `META_SUPABASE_URL` / `META_SUPABASE_SERVICE_KEY` | **Entfällt** (Meta-DB direkt via `DATABASE_URL`) |
| `API_EXTERNAL_URL` | **Entfällt** |
| `SITE_URL` | `NEXTAUTH_URL` oder `APP_URL` |
| `SUPABASE_STUDIO_URL` | **Entfällt** |
| `META_ADMIN_TOKEN` | **Entfällt** |
| `POSTGRES_PASSWORD` | Bleibt (wird für `DATABASE_URL` verwendet) |

### Variablen die für Migration benötigt werden (neu):

- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_URL` — NextAuth callback URL
- `NEXTAUTH_SECRET` — NextAuth Session key
- `RESEND_API_KEY` — Email-Versand (existiert bereits teilweise)

---

## 4. Coolify API

> **Status:** `http://localhost:8000` erreichbar, aber **nicht authentifiziert** mit aktuellen Credentials.
> Manuell prüfen unter Coolify Dashboard → Application → Environment Variables.

---

## 5. Checkliste vor Migration

- [ ] `DATABASE_URL` in `.env.local` / Coolify setzen
- [ ] `NEXTAUTH_URL` und `NEXTAUTH_SECRET` generieren und setzen
- [ ] `RESEND_API_KEY` prüfen (existiert bereits)
- [ ] Supabase-variablen aus `.env.local`, `.env.production` entfernen
- [ ] CSP in `src/middleware.ts` aktualisieren (`.supabase.co` Domains entfernen)
- [ ] `src/lib/supabase/` Verzeichnis nach Migration entfernen
- [ ] E2E Tests an neuen Auth-Flow anpassen