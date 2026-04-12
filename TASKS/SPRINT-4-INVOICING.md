# Sprint 4: Rechnungswesen (Invoicing)

## Mission
Baue das Rechnungswesen-Modul für ReinPlaner mit DATEV, ZUGFeRD und XRechnung Support.

## Kontext
ReinPlaner ist eine Software für Gebäudereinigungs-Unternehmen. Das Rechnungswesen-Modul muss:
- Aus erfassten Aufträgen (Orders) Rechnungen erstellen
- DATEV-Export für Steuerberater ermöglichen
- ZUGFeRD/XRechnung für digitale Rechnungen unterstützen
- Mahnwesen integrieren

## Anforderungen

### 1. Datenmodell
- `invoices` Tabelle: Rechnungsdaten
- `invoice_items` Tabelle: Rechnungspositionen
- `payments` Tabelle: Zahlungseingänge
- `debtors` Tabelle: Debitorenverwaltung

### 2. API/Server Actions
- `createInvoice(orderId)` - Rechnung aus Auftrag erstellen
- `getInvoices(filters)` - Rechnungen abrufen
- `sendInvoice(invoiceId)` - Per Email senden
- `markAsPaid(invoiceId, paymentDate)` - Als bezahlt markieren
- `exportDATEV(dateRange)` - DATEV-Export
- `exportZUGFeRD(invoiceId)` - ZUGFeRD/XML Export

### 3. Frontend Pages
- `/dashboard/invoices` - Rechnungsübersicht
- `/dashboard/invoices/[id]` - Rechnungsdetail
- `/dashboard/invoices/new` - Neue Rechnung erstellen
- `/dashboard/finances` - Finanzübersicht (existiert bereits, erweitern)

### 4. Integrationen
- DATEV Helper Bibliothek (datev oder selbst gebaut)
- ZUGFeRD 2.1 Format
- Resend für Email-Versand

## Tech Stack
- Next.js 15, TypeScript
- Supabase (Database, Edge Functions)
- Resend (Transactional Emails)
- jsPDF oder ähnlich für PDF-Generierung

## Deliverables
1. Invoice CRUD (Create, Read, Update)
2. Rechnungspositionen verwalten
3. DATEV Export (CSV/XML)
4. ZUGFeRD Export (UBL/XML)
5. Email-Versand mit PDF-Anhang
6. Dashboard Widget für offene Rechnungen

## Success Criteria
- Rechnung aus Auftrag erstellbar
- PDF-Generierung funktioniert
- DATEV-Export valide
- ZUGFeRD-Export valides XML
