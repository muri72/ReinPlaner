# Architecture Review: Rechnungswesen (Invoicing)

**Reviewer:** dev-architect
**Datum:** 2026-04-13
**Status:** Sprint 4 — Rechnungswesen
**Branch:** dev

---

## 1. Architektur-Überblick

### 1.1 Verzeichnisstruktur

```
src/lib/invoicing/
├── invoice-service.ts   # Service-Logik + Server Actions (PROBLEM)
├── actions.ts           # Server Action Wrapper (thin)
├── actions.test.ts      # Tests
├── invoice-service.test.ts
├── types.ts             # TypeScript Interfaces
├── pdf-generator.ts     # jsPDF PDF-Generierung
├── datev-export.ts      # DATEV + ZUGFeRD Export
├── email-service.ts     # Resend E-Mail-Versand
└── utils.ts             # (leer)
```

### 1.2 Schichtenarchitektur (Ist-Zustand)

```
UI (React Server Components)
    │
    ▼
Server Actions (actions.ts — thin wrapper)
    │
    ▼
Invoice Service (invoice-service.ts — GEMISCHT)
    ├── Business Logic (service functions)
    ├── "use server" (action exports)
    └── Direkte Supabase-Aufrufe (repository layer fehlt)
    │
    ▼
Supabase (PostgreSQL + RLS)
```

---

## 2. Kritische Befunde

### 🔴 Problem 1: Invoice-Service mischt Business Logic und Server Actions

`invoice-service.ts` enthält sowohl Service-Funktionen als auch `"use server"` Direktiven. Das ist einArchitectural Smell:

- **Wiederverwendbarkeit:** Business-Logik ist an Server Actions gekoppelt
- **Testbarkeit:** Service-Funktionen können nicht ohne Server-Kontext getestet werden
- **Klare Trennung:** Die Schichtengrenze zwischen Service und Action ist unsichtbar

**Folge:** `actions.ts` ist nur ein dünner Wrapper, der 1:1 an `invoice-service.ts` weiterleitet. Die gesamte Logik lebt in einer Datei.

### 🔴 Problem 2: Kein separates Repository/Data-Access-Layer

Alle Supabase-Aufrufe (`createAdminClient()`, `.from().select()` etc.) sind direkt in den Service-Funktionen. Das bedeutet:

- Keine Abstraktion über die Datenquelle
- SQL-Änderungen erfordern Änderungen an mehreren Stellen
- Keine zentrale Stelle für Connection Pooling, Retries oder Query-Logging
- Batch-Operationen sind nicht gekapselt

**Empfehlung:** Ein `invoicing-repository.ts` als separates Modul, das alle Supabase-Zugriffe kapselt. Service-Funktionen rufen nur Repository-Methoden auf.

### 🔴 Problem 3: Keine REST-API-Routen

Aktuell existiert **kein einziger `/api/invoices/*` Endpunkt**. Alle Operationen laufen über Server Actions:

- `getInvoicesAction()`
- `createInvoiceAction()`
- `updateInvoiceStatusAction()`

**Probleme:**
- Keine HTTP-Verb-Semantik (GET/POST/PUT/DELETE)
- Keine idempotente Operationen bei Retry (z.B. doppelte Rechnungserstellung bei Timeout)
- Keine Rate Limiting pro Endpoint
- Externe Systeme (Buchhaltung, Portale) können nicht integriert werden
- Kein API-Versioning

### 🟡 Problem 4: PDF-Generierung auf dem Main Thread

`pdf-generator.ts` nutzt `jsPDF` synchron. Bei großen Rechnungen mit vielen Positionen:
- Blockiert den Event Loop
- Kein Worker-Thread (Next.js Worker nicht genutzt)
- Bei 100+ Tenants parallel = Performance-Problem

**Empfehlung:** PDF-Generierung in einen Next.js Route Handler auslagern oder Streaming-Response nutzen.

### 🟡 Problem 5: ZUGFeRD in datev-export.ts

DATEV und ZUGFeRD sind zwei komplett unterschiedliche Exportformate:
- DATEV = proprietäres deutsches Buchhaltungsformat
- ZUGFeRD = EU-normiertes XML-Format (EN 16931)

Beide in einer Datei → Wartbarkeit leidet.

---

## 3. Scalability für 100+ Tenants

### 3.1 Was gut funktioniert

| Feature | Status | Bemerkung |
|---------|--------|-----------|
| `invoice_sequences` pro Tenant | ✅ | Eigener Nummernkreis pro Mandant |
| RLS Policies auf allen Tabellen | ✅ | `tenant_id` als Filter |
| Index auf `invoices(tenant_id)` | ✅ | |
| Index auf `invoices(status, due_date)` | ✅ | |
| Partial Indexes | ❌ | Fehlen (z.B. nur offene Rechnungen) |

### 3.2 Skalierungs-Risiken

#### Risk 1: `getInvoiceStats()` — 4 sequentielle DB-Queries

```typescript
// Sprint 4: invoice-service.ts
const { count: openCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
  .in('status', ['sent', 'partial', 'overdue']);
const { count: overdueCount } = await supabase.from('invoices')... // Query 2
const { data: paidData } = await supabase.from('invoices')...      // Query 3
const { count: draftCount } = await supabase.from('invoices')...  // Query 4
```

Bei 100+ Tenants mit jeweils vielen Rechnungen: **4 separate Full-Table-Scans** pro Dashboard-Refresh. Das skaliert nicht.

**Empfehlung:** Eine aggregierte View oder ein RPC, das alle Stats in einem Query liefert:
```sql
SELECT 
  COUNT(*) FILTER (WHERE status IN ('sent','partial','overdue')) as open_count,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
  SUM(paid_amount_cents) FILTER (WHERE status = 'paid' AND paid_at >= start_of_month) as paid_this_month,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_count
FROM invoices WHERE tenant_id = $1;
```

#### Risk 2: DATEV/ZUGFeRD Export lädt alle Rechnungen in den Speicher

```typescript
const { data: invoices } = await supabase
  .from('invoices')
  .select('*, debtor:debtors(*), items:invoice_items(*)')
  .in('status', ['paid', 'sent', 'partial'])
  .gte('issue_date', dateFrom)
  .lte('issue_date', dateTo)
```

Bei 1000 Rechnungen pro Zeitraum werden alle Daten in eine Node.js Array geladen. Für 100+ Tenants gleichzeitig → Memory Pressure.

**Empfehlung:** Streaming-Export oder Batch-Export mit Cursor-basiertem Pagination.

#### Risk 3: Invoice-Nummern-Generierung mit Race Condition

```sql
-- generate_invoice_number verwendet UPDATE + SELECT
UPDATE invoice_sequences SET current_number = v_next_num... WHERE tenant_id = p_tenant_id;
```

Bei parallelen Requests desselben Tenants kann die Sequenz übersprungen werden (lost update). PostgreSQL `SERIAL` oder `SEQUENCE` wäre robuster.

**Empfehlung:** `SELECT FOR UPDATE` oder PostgreSQL Sequences mit `nextval()`.

#### Risk 4: Kein Connection Pooling Management

Supabase Connection Pooler ist konfiguriert, aber:
- Keine explizite `pool_mode` Konfiguration sichtbar
- Keine retry-backoff Strategie bei Connection-Errors
- Kein Circuit Breaker Pattern

---

## 4. Database Schema Review

### 4.1 Schema-Bewertung

| Problem | Schweregrad | Empfehlung |
|---------|-------------|------------|
| `tenant_id` ist `NULL` in `invoices`, `payments` | 🟡 Mittel | NOT NULL DEFAULT nexus-tenant-id |
| Kein Composite Index `(tenant_id, status, due_date)` | 🟡 Mittel | Index für Tenant-spezifische Overdue-Queries |
| `invoice_number` global UNIQUE statt per-Tenant | 🟡 Mittel | UNIQUE(tenant_id, invoice_number) |
| Kein `deleted_at` Soft-Delete auf Rechnungen | 🟡 Mittel | Buchhaltungs-Compliance (GOBD) |
| Kein `metadata` JSONB für Erweiterbarkeit | 🟡 Niedrig | Flexibilität für Tenant-spezifische Felder |
| Trigger `update_invoice_totals` + App-Update parallel | 🔴 Hoch | Race Condition bei gleichzeitigem Item-Update |
| `paid_amount_cents` kein Index | 🟡 Mittel | Für "offene Posten" Queries |
| Kein Partial Index für `status = 'overdue'` | 🟡 Niedrig | Performance bei großen Tabellen |

### 4.2 Fehlende Constraints

```sql
-- Fehlt: Check Constraint für paid_amount_cents <= total_amount_cents
ALTER TABLE invoices ADD CONSTRAINT chk_paid_not_excess
  CHECK (paid_amount_cents <= total_amount_cents);

-- Fehlt: Check Constraint für positive Beträge
ALTER TABLE invoices ADD CONSTRAINT chk_positive_amounts
  CHECK (net_amount_cents >= 0 AND tax_amount_cents >= 0 AND total_amount_cents >= 0);
```

### 4.3 Invoice Number Format

Aktuell: `R/2025/00042`

**Problem:** Buchstabenpräfix `R/` ist nicht RFC-konform für einige DATEV-Import-Tools. Reine numerische oder formatierte Strings (z.B. `2025-00042`) sind robuster.

---

## 5. API Design Review

### 5.1 Aktueller Stand

```
Server Actions (keine REST API)
├── getInvoicesAction(filters)
├── getInvoiceByIdAction(id)
├── createInvoiceAction(data)
├── createInvoiceFromOrderAction(orderId, options)
├── updateInvoiceAction(id, data)
├── updateInvoiceStatusAction(id, status)
├── deleteInvoiceAction(id)
├── addInvoiceItemAction(invoiceId, item)
├── updateInvoiceItemAction(itemId, updates)
├── deleteInvoiceItemAction(itemId)
├── recordPaymentAction(invoiceId, payment)
├── exportDATEVAction(dateFrom, dateTo)
├── exportZUGFeRDAction(invoiceId)
└── sendInvoiceEmailAction(invoiceId, email?)
```

### 5.2 REST-Konformität: **Mangelhaft**

| Prinzip | Status | Bemerkung |
|---------|--------|-----------|
| Ressourcenorientierte URLs | ❌ | Keine `/api/invoices/` Routes |
| Korrekte HTTP-Methoden | ❌ | Alles POST (Server Actions) |
| Stateless | ✅ | Jeder Call hat Kontext |
| Idempotenz | ❌ | `createInvoice` nicht idempotent |
| Standard-HTTP-Statuscodes | ❌ | Keine HTTP-Responses |
| Content Negotiation | ❌ | Kein Accept-Header Support |
| Versioning | ❌ | Kein `/v1/` Prefix |

### 5.3 Empfohlene REST-API Struktur

```
GET    /api/invoices/v1/                    # Liste (paginiert, filterbar)
GET    /api/invoices/v1/:id                # Einzelne Rechnung
POST   /api/invoices/v1/                   # Erstellen
PATCH  /api/invoices/v1/:id                # Teil-Update
DELETE /api/invoices/v1/:id                # Löschen (Soft-Delete)
POST   /api/invoices/v1/:id/send           # Senden
POST   /api/invoices/v1/:id/void           # Stornieren
POST   /api/invoices/v1/:id/payments       # Zahlung erfassen
GET    /api/invoices/v1/:id/pdf            # PDF Download
GET    /api/invoices/v1/:id/zugferd        # ZUGFeRD Download
GET    /api/invoices/v1/stats             # Dashboard-Stats

GET    /api/debtors/v1/                     # Schuldner
POST   /api/debtors/v1/
GET    /api/debtors/v1/:id

GET    /api/exports/v1/datev?from=&to=      # DATEV-Export
```

### 5.4 Fehlende API-Features

| Feature | Status | Priorität |
|---------|--------|-----------|
| Rate Limiting | ❌ | Hoch |
| Request Validation (Zod) | Teilweise | Hoch |
| Idempotency Keys | ❌ | Hoch |
| Pagination (Cursor-basiert) | ❌ | Mittel |
| API-Response Envelope | ❌ | Mittel |
| OpenAPI/Swagger Docs | ❌ | Niedrig |

---

## 6. Zusammenfassung der Empfehlungen

### Must-Fix (Sprint 5 oder früher)

1. **`invoice-service.ts` aufspalten** — Business Logic in `invoicing-service.ts`, Server Actions in `invoicing-actions.ts`. Keine `"use server"` in Service-Dateien.
2. **Race Condition bei `generate_invoice_number`** — `SELECT FOR UPDATE` oder PostgreSQL Sequence nutzen.
3. **Stats-Query konsolidieren** — Ein aggregierter DB-Call statt 4 einzelner Queries.
4. **RLS Policies erweitern** — Nur Admin/Manager? Für 100+ Tenants ist ein Viewer/Mitarbeiter-Rollenmodell nötig.

### Should-Fix (Sprint 5/6)

5. **REST-API Routes implementieren** — `/api/invoices/v1/` als Ergänzung zu Server Actions (für externe Integration, API-Clients).
6. **Composite Index `(tenant_id, status, due_date)`** — Debuggable bottleneck bei Multi-Tenant-Queries.
7. **Soft-Delete implementieren** — `deleted_at` für Rechnungen (GOBD-Compliance).
8. **Constraints hinzufügen** — `CHECK (paid_amount_cents <= total_amount_cents)`.
9. **Invoice Number Format überdenken** — `R/2025/00042` → `2025-00042` (DATEV-kompatibler).

### Nice-to-Have (Sprint 6+)

10. **Repository Pattern einführen** — `invoicing-repository.ts` als Abstraktionsschicht.
11. **Caching** — `getInvoiceStats()` mit 60s TTL zwischenspeichern.
12. **Worker-Thread für PDF-Generierung** — jsPDF in einem separaten Worker.
13. **Batch-Export** — Streaming DATEV/ZUGFeRD Export für große Zeiträume.
14. **Idempotency Keys** — Bei `createInvoiceAction`.
15. **OpenAPI Dokumentation** — Für externe API-Nutzung.

---

## 7. Positiv hervorzuheben

- ✅ **Invoices, InvoiceItems, Payments, Debtors** — Sauberes Domänenmodell
- ✅ **Trigger `update_invoice_totals`** — Hält Summen konsistent auch bei direkten DB-Inserts
- ✅ **Invoice Sequences pro Tenant** — Nummernkreise sind sauber getrennt
- ✅ **RLS Policies** — Grundlegendes Multi-Tenancy ist korrekt umgesetzt
- ✅ **ZUGFeRD XML-Generierung** — Konforme EN 16931 Struktur
- ✅ **Beträge in Cents (Integer)** — Keine Floating-Point-Probleme
- ✅ **DATEV Export mit EXT F und CSV** — Beide Varianten für verschiedene Buchhaltungssysteme
- ✅ **Reminder-System** — `reminder_count`, `last_reminder_at` vorhanden
