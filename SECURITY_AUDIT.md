# Security Audit Report

**Project:** ReinPlaner  
**Date:** 2026-04-12  
**Auditor:** dev-security agent

---

## Executive Summary

Das Projekt hat mehrere sicherheitsrelevante Issues die behoben werden sollten. Die kritischsten sind die Exposition von Service-Rollen-Keys und mangelnde Authorization-Checks bei Admin-Operationen.

---

## Findings

### 🔴 CRITICAL

#### 1. Sensitive Keys in .env.local
**File:** `.env.local`  
**Severity:** CRITICAL

Die Datei enthält hochsensible Secrets:
- `SUPABASE_SERVICE_ROLE_KEY` - voller Admin-Zugriff auf Supabase
- `RESEND_API_KEY` - E-Mail-Versand
- `SENTRY_AUTH_TOKEN` - Sentry-Zugriff
- `CRON_API_KEY` - Custom API Key

**Status:** `.env.local` ist aktuell NICHT in Git (gut), aber die Datei existiert auf dem Server und enthält Secrets im Klartext.

**Recommendation:**
- [ ] `.env.local` zur `.gitignore` hinzufügen (bereits via `.env*` Pattern)
- [ ] Environment-Variablen niemals in Versionskontrolle
- [ ] Service Role Key rotieren falls exponiert
- [ ] `.env.example` erstellen mit Placeholdern

---

### 🟠 HIGH

#### 2. Admin Client Usage ohne Authorization Checks
**File:** `src/lib/actions/shift-planning.ts`  
**Severity:** HIGH

Funktionen wie `assignEmployeeToShift()`, `reassignShift()`, `deleteShift()` nutzen `createAdminClient()` für alle Operationen. RLS wird dadurch umgangen.

**Problem:**
```typescript
const supabaseAdmin = createAdminClient();
// Keine Prüfung ob User Admin/Manager ist
const { error } = await supabaseAdmin.from("shift_employees").insert({...});
```

**Impact:** Jeder authentifizierte User kann theoretisch alle Shifts modifizieren.

**Recommendation:**
- [ ] Admin-only Funktionen mit Role-Check schützen
- [ ] RLS Policies für alle relevanten Tabellen implementieren
- [ ] Auditing für kritische Operationen hinzufügen

---

#### 3. SQL Injection Potential (Low Risk aber vorhanden)
**File:** `src/lib/actions/shift-planning.ts`  
**Severity:** MEDIUM

```typescript
employeesQuery = employeesQuery.or(
  `first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%`
);
```

Supabase nutzt prepared statements, aber Input wird nicht explizit validiert.

**Recommendation:**
- [ ] Input Sanitization für `filters.query` implementieren
- [ ] Length-Limits für Query-Parameter

---

### 🟡 MEDIUM

#### 4. Impersonation ohne vollständige Auditing
**File:** `src/lib/actions/impersonation.ts`  
**Severity:** MEDIUM

Impersonation wird geloggt aber:
- Keine Benachrichtigung an impersonierten User
- Session-Timeout nicht implementiert
- Keine automatische Beendigung nach Inaktivität

**Recommendation:**
- [ ] Benachrichtigung an impersonierten User senden
- [ ] Session-Timeout implementieren
- [ ] Audit-Log erweitern für was-Impersonation-User sieht

---

#### 5. Middleware: getUser() statt getSession()
**File:** `src/middleware.ts`  
**Severity:** MEDIUM

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

`getUser()` ist strenger und kann bei Token-Problemen fehlschlagen. Für manche Flows wäre `getSession()` robuster.

**Recommendation:**
- [ ] Prüfen ob `getSession()` für diesen Anwendungsfall geeigneter ist
- [ ] Fallback-Handling für Token-Refresh

---

#### 6. CRON_API_KEY ohne Expiration/Rotation
**File:** `.env.local`  
**Severity:** MEDIUM

Der Key `sk_cron_a1b2c3d4e5f6g7h8i9j0` ist statisch und hat kein Rotation-Schema.

**Recommendation:**
- [ ] Key-Rotation implementieren
- [ ] Expiration-Datum für Cron-Jobs
- [ ] Rate-Limiting für Cron-Endpunkte

---

### 🟢 LOW

#### 7. Error Messages exposen interne Details
**Files:** Multiple Server Actions  
**Severity:** LOW

```typescript
catch (error: any) {
  console.error("Fehler:", error?.message || error);
  return { success: false, message: error.message };
}
```

Stack Traces und DB-Fehler könnten an Client exponiert werden.

**Recommendation:**
- [ ] Generic Error Messages für User
- [ ] Detaillierte Errors nur in Logs

---

## RLS (Row Level Security) Status

| Table | RLS Status | Notes |
|-------|------------|-------|
| `shifts` | Unknown | Sollte geprüft werden |
| `shift_employees` | Unknown | Sollte geprüft werden |
| `order_employee_assignments` | Unknown | Sollte geprüft werden |
| `employees` | Unknown | Sollte geprüft werden |
| `notifications` | Unknown | Sollte geprüft werden |

**Empfehlung:** RLS Policies für alle Tabellen mit sensitiven Daten implementieren.

---

## Summary Table

| Finding | Severity | Status |
|---------|----------|--------|
| Sensitive Keys in .env.local | 🔴 CRITICAL | Needs Action |
| Admin Client ohne Authorization | 🟠 HIGH | Needs Action |
| SQL Injection Potential | 🟡 MEDIUM | Monitor |
| Impersonation Auditing | 🟡 MEDIUM | Improve |
| Middleware getUser() | 🟡 MEDIUM | Review |
| Cron Key Rotation | 🟡 MEDIUM | Improve |
| Error Message Exposure | 🟢 LOW | Improve |

---

## Recommendations (Priority Order)

1. **Sofort:** Service Role Key und RESEND API Key rotieren
2. **Sofort:** Authorization-Checks für alle Admin-Operationen implementieren
3. **Kurzfristig:** RLS Policies für alle Tabellen verifizieren
4. **Kurzfristig:** Impersonation-Benachrichtigung implementieren
5. **Mittelfristig:** Cron-Key-Rotation implementieren
6. **Mittelfristig:** Input-Validierung für alle User-Inputs

---

*Generated by dev-security agent*
