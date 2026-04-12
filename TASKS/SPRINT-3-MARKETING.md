# Sprint 3: Marketing Landing Page + Abo-Flow

## Mission
Erstelle eine professionelle Marketing Landing Page für ReinPlaner auf reinplaner.de mit Pricing und Tenant Registration Flow.

## Projekt-Kontext

**GitHub:** https://github.com/muri72/ReinPlaner
**Aktuelle App:** https://reinplaner.vercel.app
**Ziel-Domain:** reinplaner.de

**Tech Stack:**
- Next.js 15.3 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Database, Auth)

**Bestehende Features:**
- Vollständiges Dashboard mit Orders, Employees, Customers, Time Tracking
- Multi-Tenant Architektur (Database-per-Tenant)
- Admin Tenant Dashboard

---

## Sprint 3a: Landing Page

### Anforderungen

**1. Hero Section**
- Headline: "Die Software für Gebäuderreinigung"
- Subline: "Planung, Zeiterfassung, Abrechnung – alles in einem. Für Reinigungsfirmen jeder Größe."
- CTA: "14 Tage kostenlos testen" → Registration
- Hero Bild/Visualisierung (可以是 Dashboard Screenshot)

**2. Features Section**
- Einsatzplanung (Kalender, Drag&Drop, Wiederholend)
- Zeiterfassung (App + Web, GPS-Tracking)
- Kundenverwaltung (Adressen, Ansprechpartner)
- Mitarbeiterverwaltung (Schichten, Touren)
- Abrechnung (Coming Soon: Rechnungswesen)
- Multi-Standort / Multi-Tenant

**3. Social Proof**
- "Trusted by X cleaning companies"
- Testimonials (wenn möglich)
- Case Studies

**4. Pricing Section**
| Plan | Preis | Features |
|------|-------|----------|
| Starter | €29/Monat | Bis 5 Benutzer, 1000 Aufträge/Monat |
| Professional | €79/Monat | Bis 25 Benutzer, API Access, Priority Support |
| Enterprise | €199/Monat | Unbegrenzt, Custom Domain, SSO, Dedicated Support |

**5. Footer**
- Kontakt (E-Mail, Telefon)
- Links (Impressum, Datenschutz, AGB)
- Social Media

### Design
- Professionell, modern, Clean
- Farbschema: Blau (#3B82F6 als Primary)
- Responsive (Mobile First)
- Schnell ladend (Performance optimiert)

---

## Sprint 3b: Tenant Registration Flow

### Anforderungen

**1. Registration Page** (`/register`)
- Firmenname (Pflichtfeld)
- Vorname + Nachname (Pflichtfeld)
- E-Mail (Pflichtfeld, wird für Login verwendet)
- Passwort (Pflichtfeld, min. 8 Zeichen)
- Plan-Auswahl (Starter/Professional/Enterprise)
- AGB Akzeptanz (Checkbox)

**2. Nach Registration**
- E-Mail Verification (via Supabase Auth)
- Tenant wird in DB erstellt (Status: "trial" oder "active")
- Redirect zu App Dashboard
- Welcome E-Mail senden (via Resend)

**3. Login Page** (`/login`)
- E-Mail + Passwort
- "Passwort vergessen" Link
- Login mit Supabase Auth

### Technical Implementation
- Supabase Auth für User Management
- Neuer Tenant in `tenants` Tabelle erstellen
- Tenant-spezifische Settings setzen
- Resend für Transactional Emails

---

## Sprint 3c: Pricing Page

### Anforderungen
- Alle 3 Pläne mit Features vergleichen
- FAQ Section
- "Kontakt für Enterprise" Button
- Upgrade/Downgrade Flow (später)

---

## Deliverables

1. **Landing Page** (`/`)
   - Hero, Features, Social Proof, Pricing, Footer
   - Responsive, performant

2. **Registration Page** (`/register`)
   - Multi-Step Form oder Single Page
   - Supabase Auth Integration

3. **Login Page** (`/login`)
   - Supabase Auth Integration
   - Password Reset

4. **Pricing Page** (`/pricing`)
   - Feature Vergleich
   - FAQ

5. **Email Templates**
   - Welcome Email
   - Email Verification

---

## Notes
- Das Projekt ist bereits auf GitHub unter `muri72/ReinPlaner`
- Branch: `dev` für Entwicklung
- Supabase Schema existiert bereits mit `tenants` Tabelle
- Resend API Key ist in Environment Variables

## Success Criteria
- Landing Page ist auf `/` erreichbar
- Registration erstellt neuen Tenant in DB
- Login funktioniert mit Supabase Auth
- Pricing zeigt alle 3 Pläne
- Mobile responsive design
