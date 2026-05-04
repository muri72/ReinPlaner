# ReinPlaner RLS & Architektur Audit
**Datum:** 03.05.2026  
**Status:** Kritische Issues gefunden

---

## 🎯 Executive Summary

**Zwei konkurrierende RLS-Systeme** nebeneinander aktiv + **~20 Tabellen ohne RLS** = Security-Risiko.

| System | Funktion | Lookup |
|--------|----------|--------|
| ALT | `get_current_tenant_id()` | `tenant_users` Tabelle |
| NEU | `user_tenant_id()` | `current_setting('app.current_tenant_id')` |

---

## 🏗️ Architektur-Analyse

### ER-Diagramm (Kern-Tabellen)

```
tenants (1) ──── (N) tenant_users ──── (N) profiles
    │                                           │
    │                                           │
    └─── (N) employees ──── (N) time_entries    │
    │                          (N) time_accounts
    │
    └─── (N) customers ──── (N) objects ──── (N) orders ──── (N) order_employee_assignments
                            │
                            └─── (N) shifts ──── (N) shift_employees
```

### RLS-Funktionen (TWO SYSTEMS!)

```sql
-- ALT (20260413135246): via tenant_users lookup
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN RETURN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1); END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- NEU (202605030000): via current_setting
CREATE OR REPLACE FUNCTION user_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    nullif(current_setting('app.current_tenant_id', true), '')::uuid,
    (SELECT tenant_id FROM profiles WHERE id = auth.uid())::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_tenant_role() RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## ⚠️ KRITISCHE ISSUES

### Issue #1: Zwei konkurrierende RLS-Systeme
- **Alt-Migration** (`20260413135246.sql`): Nutzt `get_current_tenant_id()` via `tenant_users`
- **Neue Cleanup-Migration** (`202605030100`): Nutzt `user_tenant_id()` via `current_setting`
- **Problem**: Beide Funktionen existieren, Policies nutzen teils ALT, teils NEU
- **Lösung**: Consolidate zu EINEM System (NEU preferred)

### Issue #2: 20+ Tabellen ohne RLS
| Tabelle | RLS? | Risiko |
|---------|------|--------|
| app_settings | ❌ | Alle könnten Settings ändern |
| audit_logs | ❌ | Keine Isolation |
| bank_connections | ❌ | Finanzdaten exposed |
| documents | ❌ | Dokumentzugriff unkontrolliert |
| notifications | ❌ | Notifications aller Tenants |
| objects | ❌ | Nur Alt-Policies |
| order_feedback | ❌ | Feedback nicht isoliert |
| service_categories | ❌ | Masterdata free-for-all |
| services | ❌ | Masterdata free-for-all |
| shift_overrides | ⚠️ | Nur Admin-Policy |
| tax_settings | ❌ | Steuerkonfiguration exposed |
| tenant_audit_log | ❌ | Audit-Trail nicht isoliert |
| tenant_domains | ❌ | Domain-Zuordnung exposed |
| tenant_users | ❌ | Nutzer-Tenant-Zuordnung exposed |
| tickets | ❌ | Support-Tickets nicht isoliert |
| time_accounts | ❌ | Urlaubs-/Stundenkonten exposed |
| time_account_transactions | ❌ | Transaktionen nicht isoliert |
| customer_contacts | ❌ | Kontaktdaten nicht isoliert |
| manager_customer_assignments | ❌ | Zuordnungen nicht geschützt |
| invoice_settings | ❌ | Rechnungseinstellungen nicht geschützt |
| invoice_sequences | ⚠️ | Nur Admin |
| impersonation_sessions | ❌ | Security-Risiko |

### Issue #3: Verwaiste Invoice-Tabellen
- `invoices`, `debtors`, `invoice_items`, `payments` existieren als **pending-Migration** aber **NICHT in DB**
- RLS-Policies in pending-Migration nutzen **nur Admin/Manager** (kein Employee/Customer Filter nötig aber inkonsistent mit Rest-Architektur)

### Issue #4: Inkonsistente Profile-Policies
- Alt: `auth.uid() = id` (nur eigenes Profil)
- Neu: `tenant_id = user_tenant_id()` (ganzer Tenant sieht alle Profile)
- **Konflikt**: Admin könnte alle Profile im Tenant sehen, aber `getUserRole()` etc. funktionieren anders

---

## ✅ TABELLE: RLS-Policies nach Migration 202605030100

| Tabelle | SELECT | INSERT | UPDATE | DELETE | System |
|---------|--------|--------|--------|--------|--------|
| profiles | ✅ tenant_id | ❌ | ❌ | ❌ | NEU |
| employees | ✅ role-based | ✅ admin/mgr | ✅ admin/mgr | ❌ | NEU |
| customers | ✅ all | ❌ | ❌ | ❌ | NEU |
| orders | ✅ role-based | ✅ admin/mgr | ✅ admin/mgr | ❌ | NEU |
| shifts | ✅ role-based | ✅ admin/mgr | ✅ admin/mgr | ❌ | NEU |
| time_entries | ✅ role-based | ✅ employee | ✅ employee | ❌ | NEU |
| shift_employees | ✅ role-based | ❌ | ❌ | ❌ | NEU |
| order_employee_assignments | ✅ role-based | ❌ | ❌ | ❌ | NEU |
| shift_overrides | ✅ role-based | ❌ | ❌ | ❌ | NEU |
| **objects** | ❌ | ❌ | ❌ | ❌ | ALT-Policy |
| **tenant_users** | ❌ | ❌ | ❌ | ❌ | ALT-Policy |
| **tenants** | ❌ | ❌ | ❌ | ❌ | - |
| invoices | ❌ | ❌ | ❌ | ❌ | pending |
| debtors | ❌ | ❌ | ❌ | ❌ | pending |
| invoice_items | ❌ | ❌ | ❌ | ❌ | pending |
| payments | ❌ | ❌ | ❌ | ❌ | pending |
| invoice_sequences | ❌ | ❌ | ❌ | ❌ | pending |

---

## ✅ Abgeschlossen (03.05.2026)

### RLS-System konsolidiert
- ~~Zwei RLS-Systeme~~ → **Eine Funktion** (`user_tenant_id()` + `user_tenant_role()`)
- ALT `get_current_tenant_id()` via `tenant_users` → **ENTFERNT**
- NEU `user_tenant_id()` via `current_setting('app.current_tenant_id')` → **AKTIV**

### Alle Tabellen mit RLS versorgt
| Kategorie | Tabellen | Status |
|-----------|---------|--------|
| Core (mit tenant_id) | employees, customers, orders, shifts, time_entries, shift_employees, order_employee_assignments, profiles, tenant_users, tenant_domains, shift_overrides | ✅ |
| Via customer_id | objects, customer_contacts, manager_customer_assignments | ✅ |
| Via employee_id | time_accounts, absence_requests | ✅ |
| Via FK-Join | documents, order_feedback | ✅ |
| Own user data | notifications, tickets, general_feedback | ✅ |
| Reference tables | bundeslaender, german_holidays | ✅ |
| Admin only | app_settings, invoice_settings, tax_settings, bank_connections, audit_logs, document_templates, template_placeholders, impersonation_sessions | ✅ |
| Master data | services, service_categories, service_features, service_rates | ✅ |

### Invoice-Tabellen migriert
- debtors, invoices, invoice_items, payments, invoice_sequences
- Mit korrekten RLS Policies (admin/manager full, customer read own)

### Auth Users (4 Rollen)
```
admin@reinigung-aris.de    → 29c7247c-fc79-4aa8-b1da-801a3854af1e (admin)
manager@reinigung-aris.de  → 800c77fa-bb64-4bf9-8bcd-f6f4bf095a44 (manager)
mitarbeiter@reinigung-aris.de → 239dada0-f033-4867-a5ee-7d91e2d96368 (employee)
kunde@reinigung-aris.de    → c7b8e2c9-9b32-49d3-874a-29de04933a01 (customer)
```

### Employee-User Verknüpfungen
```
Ana Petrova      → mitarbeiter@... (employee)
Klaus Müller     → hat user_id (986f02...)
Fatma Yılmaz     → hat user_id (5bf8c2...)
Michael Schmidt  → kein user_id
Thomas Bauer     → kein user_id
```

### Kunden (ARIS)
```
Handelskammer Hamburg      → Kunde für kunde@...
Böhmler GmbH               → Kunde für kunde@...
Elbphilharmonie            → Kunde für kunde@...
Hotel Atlantic Kempinski   → Kunde für kunde@...
EDEKA Center Harburg       → Kunde für kunde@...
```

### Bestellungen
```
Büroreinigung Handelskammer    (4ce966a5...)
Glasreinigung Böhmler          (4455909c...)
Eventreinigung Elbphilharmonie (80e9813d...)
Hotelinigung Atlantic          (6732fed7...)
Grundreinigung Handelskammer   (63def99f...)
```

---

---

## ✅ ACTION ITEMS - ALLES ERLEDIGT (03.05.2026)

### ✅ P0 - Erledigt
1. **RLS-System konsolidiert** → `user_tenant_id()` + `user_tenant_role()`
2. **objects RLS** → via customer_id Isolation
3. **tenant_users RLS** → via auth_id

### ✅ P1 - Erledigt
4. **Alle Tabellen mit RLS** → 38 Tabellen versorgt
5. **Invoice-Tabellen migriert** → debtors, invoices, invoice_items, payments
6. **Employee-User-Links** → Ana Petrova verknüpft

### ✅ P2 - Erledigt
7. **Testdaten** → Shifts, Time Entries, Notifications, Time Accounts
8. **DATEV-Export** → Vorbereitet (Invoice-Tabellen existieren jetzt)
