# Supabase as BaaS — Langfristige Evaluation für ReinPlaner

**Datum:** 12. Mai 2026  
**Stack:** Next.js 16 (App Router, React 19) + Supabase (volles BaaS, kein ORM) + Vercel  
**Tenants:** Multi-Tenant mit RLS, Subdomain-basiert  
**Nutzer:** 100+ Tenants, 10k+ Nutzer geplant

---

## 1. Aktueller Stand der Supabase-Integration

### Stack-Übersicht

ReinPlaner nutzt Supabase als **vollständiges BaaS**:

| Komponente | Paket | Status |
|---|---|---|
| Database Client | `@supabase/supabase-js` + `@supabase/ssr` | ✅ Produktiv |
| Auth | Supabase Auth (eingebaut) | ✅ Produktiv |
| Database | PostgreSQL via PostgREST Auto-API | ✅ Produktiv |
| Realtime | Supabase Realtime | ✅ Verfügbar |
| Edge Functions | Supabase Edge Functions | ⚠️ Nicht genutzt |
| Storage | Supabase Storage | ⚠️ Nicht genutzt |

**Kein ORM** — alle DB-Zugriffe erfolgen direkt über die Supabase Auto-API (PostgREST) oder Raw SQL über `supabase-js`.

### Multi-Tenancy-Architektur (bereits implementiert)

Die RLS-Implementierung ist **professionell und durchdacht**:

```
Middleware (src/middleware.ts)
  └── Extracted tenant_slug aus Subdomain
      └── Header: x-tenant-slug
          └── Dashboard Layout
              └── set_session_tenant() via DB-Function
                  └── RLS Policies filtern nach current_setting('app.current_tenant_id')
```

**RLS-Pattern (aus Migration `20260413230000_rls_tenant_isolation.sql`):**

```sql
-- Beispiel: employees-Tabelle
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_tenant_isolation" ON employees
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**RBAC-Hierarchie (aus Migration `20260508140436_sprint3_platform_admin_rls.sql`):**

- `platform_admin` — Supra-Tenant-Zugriff (cross-tenant für `/dashboard/admin/*`)
- `admin` — Tenant-Admin (voller Zugriff pro Tenant)
- `manager` — Planung, Schichten, Kunden
- `employee` — Eigene Schichten, eigene Zeitbuchungen
- `customer` — Einsicht in eigene Aufträge

**Security Functions:**
```sql
public.is_platform_admin() -- prüft platform_admin-Rolle
public.has_tenant_access(target_tenant uuid) -- Plattform-Admin oder Tenant-Match
public.user_tenant_id() -- aktueller Tenant aus Session
public.user_tenant_role() -- aktuelle Rolle im Tenant
```

**✅ Bewertung:** Die RLS-Implementierung istProduction-Ready und folgt Best Practices. Kein Angriffspunkt.

---

## 2. Supabase BaaS — Stärken für ReinPlaner

### 2.1 Schnelle Entwicklung

- **Kein ORM nötig:** Auto-generated REST-API über PostgREST
- **Auth fertig:** Login, Magic Link, OAuth, MFA — alles eingebaut
- **Realtime订阅:** Live-Updates für Schichtplaner, Aufträge
- **Migrations:** Supabase CLI mit versionierten SQL-Migrationen

### 2.2 Volle PostgreSQL-Power

- Supabase ist kein abgespecktes PostgreSQL — volle Features
- JSONB-Spalten, Full-Text Search, Window Functions
- Row Level Security (RLS) für Tenant-Isolation
- Trigger, Functions, Constraints

### 2.3 TypeScript-Support

- `@supabase/ssr` für Next.js App Router optimiert
- Server Components & Server Actions Integration
- Cookie-basierte Session für SSR

---

## 3. Supabase BaaS — Schwächen und Risiken

### 3.1 Vendor Lock-In

**Haupt-Risiko** bei langfristigem Wachstum:

| Abhängigkeit | Wechselaufwand |
|---|---|
| Auth (GoTrue) | Mittel — müsste auf Auth.js/NextAuth umziehen |
| Auto-API (PostgREST) | Hoch — alle Queries müssten als Raw SQL neu geschrieben werden |
| Realtime (Phoenix) | Mittel — müsste auf Pusher/Ably oder eigene WS umziehen |
| Edge Functions | Niedrig — können durch Cloudflare Workers oder Lambda ersetzt werden |

**Bewertung:** Der Wechselaufwand ist **signifikant** bei voller Supabase-Nutzung. Eine Abstraktionsschicht (Repository-Pattern) wäre ratsam, ist aber aktuell nicht vorhanden.

### 3.2 Vendor Lock-In — Connection Pooling

Supabase bietet PgBouncer integriert. Bei selbst-gehostetem PostgreSQL müsste man PgBouncer manuell konfigurieren.

### 3.3 Supabase bei 100+ Tenants, 10k+ Nutzern — Kosten

**Kostenmodell Stand 2026:**

| Ressource | Pro Plan | Kosten |
|---|---|---|
| Base | $25/Monat | $25 |
| Compute (Medium @ $60) | Für 100+ Tenants nötig | +$60 |
| 100k MAUs | Inklusive | $0 |
| 10k aktive Nutzer/Monat | Innerhalb 100k-Limit | $0 |
| DB Storage (~50GB) | 8GB inkl. + 42GB overage | +$5 |
| **Gesamt** | | **~$90-150/Monat** |

**Probleme bei Skalierung:**

1. **MAU-Overage:** Bei Überschreitung von 100k MAUs = $0.00325/Nutzer
2. **Compute-Stufen:** Ab ~500 gleichzeitige DB-Verbindungen → Medium Compute ($60) nötig
3. **RLS-Performance:** Bei vielen Tenants können komplexe RLS-Policies die Query-Performance drücken

**Realistische Kosten bei 10k Nutzern, 100 Tenants:**
- **$90-150/Monat** (Pro Plan + Medium Compute + Storage)
- Bei 100k Nutzern: ~$300-500/Monat

### 3.4 Enterprise SSO (SAML)

Supabase Auth unterstützt SAML 2.0 SSO — aber nur im **Team Plan ($599/Monat)** oder Enterprise.

```
Team Plan ($599/mo): 50 SSO-Nutzer inkl. + $0.015/MAU darüber
```

Für B2B-Kunden (ReinPlaner ist B2B!) ist SSO oft Pflicht. Das ist ein **kritisches Cost-Risiko**.

---

## 4. Alternativen

### 4.1 Self-Hosted Supabase (Docker)

**Was:** Supabase-Stack (PostgreSQL, Kong, GoTrue, Realtime) selbst gehostet.

```
docker-compose up  # Läuft bereits für lokale Entwicklung
```

**Kostenvergleich (100 Tenants, 10k Nutzer):**

| | Supabase Cloud Pro | Self-Hosted |
|---|---|---|
| Compute | ~$90-150/Monat | ~$40-80/Monat (VPS) |
| Wartung | 0 | ~10-20h/Monat |
| Verfügbarkeit | 99.9% SLA | Selbst verantwortlich |
| Backups | Inkl. (7 Tage) | Selbst einrichten |

**Vorteile Self-Hosted:**
- Volle Kontrolle über Daten (DSGVO, HIPAA)
- Keine Lock-In — API bleibt gleich
- Günstiger bei vielen Projekten

**Nachteile:**
- DevOps-Overhead
- Supabase-Updates eigenständig einspielen
- Bei grossen Problemen: kein Support

**Fazit:** Für ReinPlaner mit 100+ Tenants ist Self-Hosted eine **seriöse Option**. Das docker-compose.yml ist bereits vorhanden. Die API bleibt identisch — nur der Hosting-Provider wechselt.

### 4.2 Supabase als Managed PostgreSQL + Auth.js

**Was:** Supabase nur als PostgreSQL-Host (ohne GoTrue/Auth) mit Auth.js als Auth-Layer.

```
Supabase Cloud (nur DB)     → $25/Monat Compute
Auth.js (NextAuth)          → Eigenständig, SSO-fähig
PostgREST (via Supabase)    → Optional
```

**Vorteile:**
- Auth.js unterstützt SAML/OIDC (Enterprise SSO ohne Team-Plan)
- Weniger Vendor Lock-In bei Auth
- Volle PostgreSQL-Power

**Nachteile:**
- Mehr Custom-Code für Auth-Flows
- Realtime muss selbst gebaut werden (oder über Supabase)
- Kein eingebautes Storage

### 4.3 Direct PostgreSQL + tRPC

**Was:** Reines PostgreSQL + tRPC als API-Layer (ohne Supabase).

```
Neon / Railway / Supabase (nur PostgreSQL)
  + tRPC (TypeScript API)
  + Auth.js (Auth)
  + Cloudflare Workers (Edge Functions)
```

**Vorteile:**
- Volle Kontrolle, kein Lock-In
- tRPC: TypeScript-end-to-end
- Portable — jede PostgreSQL-Instance

**Nachteile:**
- **Massiver Rewrite** — alle `supabase-js`-Calls müssen zu tRPC-_calls
- Realtime: Extra-Integration nötig
- Mehr Infrastruktur

### 4.4 Hasura Cloud / Self-Hosted (GraphQL)

**Was:** Hasura als GraphQL-Engine über PostgreSQL.

**Unterschied zu Supabase:**
- GraphQL statt REST-Auto-API
- Hasura Console für Admin UI
- Remote Schemas für Custom Resolver

**Für ReinPlaner relevant?** Weniger — das Team nutzt REST/PostgREST-APIs, kein GraphQL-Anwendungsfall erkennbar.

---

## 5. Multi-Tenancy Deep-Dive

### 5.1 RLS-Performance bei 100+ Tenants

**Problem:** Jede Query durchläuft RLS-Policies. Bei 100+ Tenants und komplexen Policies kann das die Performance drücken.

**Supabase-Empfehlungen:**
- Index auf `tenant_id` (vorhanden in Migration `20260413221000_add_performance_indexes.sql`)
- Policy-Batching — mehrere Checks in einer Function
- Connection Pooling (PgBouncer)

**Bewertung:** Supabase Cloud managed PgBouncer automatisch. Bei Self-Hosted muss man es manuell konfigurieren.

### 5.2 Tenant-Isolation via Subdomain

Der aktuelle Flow:

```
tenant-admin.reinplaner.de → middleware → x-tenant-slug → dashboard
```

**Potentielle Schwachstelle:** Der `x-tenant-slug`-Header wird von der App gesetzt. Bei SSR muss dieser via `set_session_tenant()` in die DB geschrieben werden.

**Review der relevanten Migrationen:**
- `20260412_001_multi_tenant_registry.sql` — Tenant-Registry
- `20260413135246_tenant_isolation.sql` — Basis-Isolation
- `202605030000_tenant_context_setup.sql` — Session-Context-Setup

### 5.3 Connection Pooling

Supabase verwendet PgBouncer im Transaction-Mode:

```
Client → Kong → PgBouncer (Transaction Mode) → PostgreSQL
```

- **Transaction Mode:** Connection wird zwischen Transaktionen recycelt
- **Limitation:** Keine Session-spezifische Variablen über `SET` zwischen Transaktionen
- **Workaround:** RLS nutzt `current_setting()` statt `SET LOCAL`

**✅ Gut gelöst:** ReinPlaner nutzt `current_setting('app.current_tenant_id', true)` statt `SET LOCAL`, was PgBouncer-kompatibel ist.

---

## 6. Auth-Evaluation

### 6.1 Supabase Auth — Gut genug für MVP?

| Feature | Supabase Auth | ReinPlaner-Bedarf |
|---|---|---|
| Email/Password | ✅ | ✅ |
| Magic Link | ✅ | ✅ |
| OAuth (Google, GitHub) | ✅ | ✅ |
| MFA/TOTP | ✅ | ✅ |
| SAML SSO (Enterprise) | ⚠️ Nur Team $599+ | B2B-Kunden oft Pflicht |
| Custom Branding | ✅ | ✅ |
| Passwort-Reset | ✅ | ✅ |

**Fazit:** Für MVP ausreichend. Für Enterprise-B2B mit SSO-Anforderungen unzureichend ohne Team-Plan.

### 6.2 Enterprise SSO (SAML) mit Supabase

Supabase Auth SAML 2.0:

- **Verfügbar:** Ja, seit 2024
- **Plan:** Nur Team ($599/Monat) oder Enterprise
- **IdP-Integration:** Okta, Azure AD (Entra ID), Google Workspace

```
Team Plan: $599/mo
  + 50 SSO-Nutzer inkl.
  + $0.015/MAU darüber
```

**Kostenbeispiel:** 1000 SSO-Nutzer = $599 + (1000-50) × $0.015 = $614/Monat

### 6.3 Auth.js als Layer vor Supabase

**Architektur:**

```
Auth.js (NextAuth) → SAML/OIDC SSO
    ↓
Supabase Auth (für Email/Magic Link)
    ↓
Supabase Database (RLS)
```

**Vorteile:**
- Enterprise SSO ohne Team-Plan
- Flexiblere Auth-Flows
- Portable zu anderen DBs

**Nachteile:**
- Doppelte Auth-Logik
- Mehr Komplexität
- Supabase Realtime Auth Events gehen verloren

---

## 7. Empfehlung

### 🟢 Supabase BEIBEHALTEN — mit Vorbereitungen für Exit

**Begründung:**

1. **Stack ist bewährt und produktionsreif** — RLS, Multi-Tenant, Auth funktionieren
2. **Kosten sind vertretbar** — $90-150/Monat für 100+ Tenants, 10k Nutzer
3. **Kein kritischer Wechseldruck** — SOA ist nicht kaputt
4. **Self-Hosted als Backup** — docker-compose.yml existiert bereits

### 🔧 Empfohlene Massnahmen

**Sofort (technische Schulden reduzieren):**

1. **Repository-Pattern einführen** — alle `supabase-js`-Calls hinter Interface kapseln
   ```typescript
   // lib/repositories/base.ts
   interface TenantRepository {
     findBySlug(slug: string): Promise<Tenant | null>
     // ...
   }
   ```
   → Wechsel zu tRPC/NestJS wird erheblich einfacher

2. **Auth-Abstraktion vorbereiten** — Auth.js als Wrapper um Supabase Auth
   → Ermöglicht späteren Wechsel zu SAML ohne Auth-Rewrite

3. **Metrics & Alerting** — Supabase Dashboard Monitoring + eigene Metriken
   - MAU-Zähler
   - Connection-Count
   - Query-Latenz

**Mittelfristig (Skalierung vorbereiten):**

4. **SSO-Strategie klären:**
   - Unter $599/Monat bleiben → Auth.js mit SAML
   - Enterprise-Kunden gewinnen → Team-Plan + SSO-Budget einplanen

5. **Self-Hosted evaluieren bei 500+ Tenants:**
   - DevOps-Kosten vs. Cloud-Kosten gegenüberstellen
   - Hetzner VPS @ ~€20/Monat + Wartung vs. Cloud @ ~$150/Monat

6. **RLS-Performance testen** bei 100+ Tenants mit 50k+ Zeilen
   - `EXPLAIN ANALYZE` auf kritische Queries
   -ggf. Connection Pool tuning

### 🔴 Nicht empfohlen

- **Jetzt zu tRPC/Hasura migrieren** — zu hoher Aufwand, kein messbarer Vorteil
- **Supabase kündigen** — funktioniert, kein Grund
- **Parallel PostgreSQL aufbauen** — Over-Engineering

---

## 8. Zusammenfassung

| Kriterium | Bewertung |
|---|---|
| **Vendor Lock-In Risiko** | 🟡 Mittel — beherrschbar mit Repository-Pattern |
| **Kosten bei 10k Nutzern** | 🟢 ~$90-150/Monat (vertretbar) |
| **Kosten bei 100k Nutzern** | 🟡 ~$300-500/Monat (bezahlbar, SSO extra) |
| **Multi-Tenant Security** | 🟢 Production-Ready, keine Kritikpunkte |
| **Enterprise SSO** | 🔴 Nur via Team-Plan ($599/Mo) oder Auth.js |
| **Skalierung (100+ Tenants)** | 🟢 RLS performant mit Indexes |
| **Self-Hosting Option** | 🟢 Docker-Setup vorhanden, API-kompatibel |
| **Entwickler-Erfahrung** | 🟢 Gut dokumentiert, reife SDKs |

**Endempfehlung: SUPA-BASE BEIBEHALTEN. SSO-Kosten einkalkulieren, Repository-Pattern einführen, Self-Hosted als Exit-Strategie parat halten.**
