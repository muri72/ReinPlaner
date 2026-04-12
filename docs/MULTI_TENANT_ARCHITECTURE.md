# ReinPlaner Multi-Tenant Architecture

**Status:** Planning  
**Datum:** 2026-04-12  
**Version:** 1.0

---

## 1. Warum Multi-Tenant?

### Ziel
- Mehrere Gebäudereinigungs-Unternehmen (Tenants) hosten
- Jeder Tenant: Eigene Datenbank, eigene Konfiguration
- White-Labeling für individuelle Marken

### Vorteile
| Aspekt | Benefit |
|--------|---------|
| **Skalierbarkeit** | Neuer Kunde = neue DB-Instanz |
| **Datenschutz/GDPR** | Komplette Datenisolation |
| **Backup/Restore** | Per Tenant möglich |
| **羊肉串 Security** | Kein Cross-Tenant-Zugriff möglich |
| **Premium-Tiers** | Enterprise = dedizierte DB |

---

## 2. Architektur-Optionen

### Option A: Database-per-Tenant (Empfohlen)
```
┌─────────────────────────────────────────────────────────┐
│                    ReinPlaner SaaS                       │
├─────────────────────────────────────────────────────────┤
│  Tenant 1          Tenant 2          Tenant N          │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│  │ DB: r1  │      │ DB: r2  │      │ DB: rN  │        │
│  │ Schema  │      │ Schema  │      │ Schema  │        │
│  └─────────┘      └─────────┘      └─────────┘        │
│       ↓                ↓                ↓              │
│  ┌─────────────────────────────────────────────┐       │
│  │          Shared Application Server          │       │
│  │           (Next.js + Server Actions)        │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Maximale Isolation
- ✅ GDPR-konform (DSGVO)
- ✅ Einfaches Backup/Restore pro Tenant
- ✅ Keine RLS-Policy Fehler
- ✅ Enterprise-verkäuflich

**Cons:**
- ❌ Höhere Infrastrukturkosten
- ❌ Komplexere Schema-Migrationen
- ❌ Connection Pool Management

---

### Option B: Schema-per-Tenant
- PostgreSQL Schemas pro Tenant
- Pros: Günstiger, weniger DB-Overhead
- Cons: Weniger Isolation, komplexere Backups

### Option C: Row-Level-Security (RLS)
- Single DB, alle Tabellen mit `tenant_id`
- Pros: Kostengünstig, einfach zu starten
- Cons: Performance bei >100 Tenants, RLS Bugs möglich

---

## 3. Empfohlene Architektur: Database-per-Tenant

### 3.1 Datenbank-Struktur

```
PostgreSQL Instance (Supabase)
├── Tenant: reinplaner_de (mk's Firma)
│   ├── orders
│   ├── employees
│   ├── customers
│   ├── time_entries
│   └── ...
│
├── Tenant: firma2_de
│   ├── orders
│   ├── employees
│   └── ...
│
└── Tenant: firma3_at (Österreich)
    ├── orders
    └── ...
```

### 3.2 Neue Tabellen für Tenant-Management

```sql
-- Tenant Registry (in einer Shared DB)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'reinplaner', 'firma2', etc.
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE, -- 'reinplaner.de', 'firma2.de'
  database_url TEXT, -- Connection string zur Tenant-DB
  plan VARCHAR(20) DEFAULT 'starter', -- 'starter', 'professional', 'enterprise'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subdomain Mapping
CREATE TABLE tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  domain VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ
);
```

### 3.3 Supabase Multi-Project Setup

```
Supabase Organization: ReinPlaner
├── Project: ReinPlaner-Platform (Meta/Admin)
│   └── DB: tenant_registry, billing, global config
│
├── Project: ReinPlaner-reinplaner-de (mk)
│   └── DB: Tenant-spezifische Daten
│
├── Project: ReinPlaner-firma2-de
│   └── DB: Tenant-spezifische Daten
│
└── Project: ReinPlaner-firma3-at
    └── DB: Tenant-spezifische Daten
```

---

## 4. Routing-Strategie

### 4.1 Subdomain-basiert (Empfohlen)
```
https://firma1.reinplaner.de  → Tenant: firma1
https://firma2.reinplaner.de  → Tenant: firma2
https://reinplaner.de          → Tenant: reinplaner (Hauptmieter)
```

### 4.2 Pfad-basiert
```
https://reinplaner.de/firma1  → Tenant: firma1
https://reinplaner.de/firma2  → Tenant: firma2
```

### 4.3 Custom Domain
```
https://firma1.de  → Tenant: firma1 (CNAME zu reinplaner.de)
```

---

## 5. Authentifizierung

### 5.1 Multi-Tenant Auth Flow
```
1. User besucht: https://firma1.reinplaner.de
2. Middleware erkennt Tenant via Subdomain
3. User wird zu Supabase Auth (firma1's Projekt) weitergeleitet
4. Nach Login: JWT enthält tenant_id Claim
5. Server Actions filtern automatisch nach tenant_id
```

### 5.2 Tenant-spezifische Supabase Auth
- Jeder Tenant hat eigenes Supabase Auth Projekt
- Oder: Single Auth mit tenant_id in User Metadata
- **Empfehlung:** Separate Supabase Projects pro Tenant (Enterprise), Shared Auth für SMB

---

## 6. Implementierungs-Phasen

### Phase 1: Kern-Infrastruktur (4-6 Wochen)
- [ ] Tenant Registry DB/Schema
- [ ] Middleware für Subdomain-Routing
- [ ] Tenant-Kontext in Server Actions
- [ ] Connection Pooling pro Tenant

### Phase 2: Datenmigration (2-3 Wochen)
- [ ] Bestehende DB → Tenant-1 umziehen
- [ ] Schema-Migration Script
- [ ] Daten-Validierung

### Phase 3: Onboarding-Flow (3-4 Wochen)
- [ ] Admin Dashboard für Tenant-Verwaltung
- [ ] Self-Service Tenant-Registrierung
- [ ] Custom Domain Verification
- [ ] Stripe/Payment Integration

### Phase 4: Enterprise Features (4-6 Wochen)
- [ ] White-Labeling (Custom Logos, Farben)
- [ ] API-Keys für Drittanbieter
- [ ] Audit Logs pro Tenant
- [ ] Tenant-spezifische Backups

---

## 7. Technische Entscheidungen

### 7.1 Connection Management
```typescript
// lib/tenant-connection.ts
class TenantConnectionPool {
  private pools = new Map<string, Pool>();
  
  async getPool(tenantSlug: string): Pool> {
    if (!this.pools.has(tenantSlug)) {
      const dbUrl = await this.getTenantDatabaseUrl(tenantSlug);
      this.pools.set(tenantSlug, new Pool({ connectionString: dbUrl }));
    }
    return this.pools.get(tenantSlug);
  }
}
```

### 7.2 Middleware
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('hostname');
  const tenantSlug = extractTenantFromSubdomain(hostname);
  
  // Tenant-ID in Header für Server Actions
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenantSlug);
  return response;
}
```

### 7.3 Typen
```typescript
// types/tenant.ts
interface TenantContext {
  id: string;
  slug: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  settings: TenantSettings;
}

interface TenantAwareRequest {
  tenant: TenantContext;
  user: User;
}
```

---

## 8. Pricing/Tiers

| Feature | Starter (€29/mo) | Professional (€79/mo) | Enterprise (€199/mo) |
|---------|------------------|----------------------|---------------------|
| Benutzer | bis 5 | bis 25 | Unbegrenzt |
| Tenant DB | Shared | Dedicated | Dedicated |
| Custom Domain | ❌ | ✅ | ✅ |
| Backup | Weekly | Daily | Real-time |
| Support | Email | Priority | Dedicated |
| API Access | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ✅ |

---

## 9. Migration der Bestandsdaten

mk's aktuelle Daten bleiben in der bestehenden Supabase Instanz und werden zu Tenant "reinplaner" migriert.

```bash
# Export
pg_dump existing_db > backup.sql

# Import in neue Tenant-DB
psql tenant_reinplaner_db < backup.sql

# Tenant-ID hinzufügen
ALTER TABLE orders ADD COLUMN tenant_id UUID DEFAULT 'reinplaner-uuid';
```

---

## 10. Nächste Schritte

1. **Supabase Projects erstellen:**
   - ReinPlaner-Platform (Meta/Admin)
   - ReinPlaner-reinplaner (mk's Tenant)

2. **Code-Anpassungen:**
   - Middleware für Subdomain-Routing
   - Tenant-Kontext Utility
   - Connection Pool Management

3. **Dokumentation:**
   - Architektur-ADRs
   - Tenant-Onboarding-Guide
   - API-Dokumentation

---

## Ansprechpartner / Stakeholder

- **Entwicklung:** AI Agents (OpenClaw)
- **Produkt:** mk
- **Infrastruktur:** Supabase + Vercel

---

## Referenzen

- [Supabase Multi-Tenant Patterns](https://supabase.com/docs/guides/database-multi-tenancy)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
