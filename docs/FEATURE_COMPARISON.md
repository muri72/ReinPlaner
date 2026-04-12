# ReinPlaner vs pland.app Feature Comparison

> **Erstellt:** 2026-04-12  
> **Zweck:** Feature-Gap-Analyse für ReinPlaner – Gebäudereinigungs-Management SaaS  
> **Inspiration:** pland.app (https://help.pland.app/de/)

---

## 1. Executive Summary

**pland.app** ist der etablierte Marktführer für Gebäudereinigungs-Software im deutschsprachigen Raum (DACH). Die Software existiert seit Jahren, hat eine reife Mobile App (iOS/Android), vollständige Rechnungswesen-Integration (Datev, ZUGFeRD, Bankanbindung), und ein umfangreiches OData/CSV-Import-System.

**ReinPlaner** ist ein moderner Newcomer mit Next.js 15/React 19/TypeScript, TanStack Query v5, und Supabase als Backend. Der Fokus liegt auf sauberer Architektur und gutem UX. Die größten Gaps bestehen im Rechnungswesen und der Mobile App.

| Kategorie | pland.app | ReinPlaner | Gap |
|-----------|-----------|------------|-----|
| Einsatzplanung | ✅ Full | ✅ Full | None |
| Zeiterfassung | ✅ Full | ✅ Basic | Small |
| Rechnungswesen | ✅ Enterprise | ⚠️ Planned | **Large** |
| Mobile App | ✅ Native (iOS/Android) | ⚠️ Web-based | **Large** |
| Personal/HR | ✅ Full | ⚠️ Basic | Medium |
| Kundenmanagement | ✅ CRM-like | ⚠️ Basic | Medium |
| Schnittstellen | ✅ Datev, ZUGFeRD, API | ❌ None | **Large** |
| Material/Tickets | ✅ Full | ❌ None | **Large** |

---

## 2. Feature Matrix

### 2.1 Einsatzplanung & Aufträge (Order Management)

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Aufträge erstellen/bearbeiten | ✅ | ✅ | ✅ | Must Have |
| Wiederkehrende Einsätze | ✅ | ✅ | ✅ | Must Have |
| Einmalige Einsätze | ✅ | ✅ | ✅ | Must Have |
| Wochen-/Monatsplanung (Kalender) | ✅ | ✅ | ✅ | Must Have |
| Mitarbeiter-Zuweisung | ✅ | ✅ | ✅ | Must Have |
| Zeitfenster (Start/Ende) | ✅ | ✅ | ✅ | Must Have |
| Fahrzeiten erfassen | ✅ | ✅ | ✅ | Must Have |
| Pause/Break-Zeiten | ✅ | ✅ | ✅ | Must Have |
| Prioritäten (P1-P4) | ✅ | ✅ | ✅ | Must Have |
| Multi-Objekt-Zuweisung | ✅ | ✅ | ✅ | Should Have |
| Budget/Deckung prüfen | ✅ | ❌ | Gap | Should Have |
| Zuschläge (Nacht/Wochenende) | ✅ | ❌ | Gap | Should Have |
| Arbeitsscheine (digital) | ✅ | ❌ | Gap | Should Have |
| Stornierung mit Workflow | ✅ | ❌ | Gap | Should Have |

### 2.2 Zeiterfassung (Time Tracking)

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Echtzeit-Zeiterfassung (App) | ✅ | ⚠️ Web | Gap | Must Have |
| Start/Stopp per Mitarbeiter | ✅ | ⚠️ Web | Gap | Must Have |
| GPS-Tracking | ✅ | ❌ | Gap | Should Have |
| Fahrzeiten manuell nachtragen | ✅ | ❌ | Gap | Should Have |
| Abweichende Zeiten nachtragen | ✅ | ❌ | Gap | Should Have |
| Freie Zeiterfassung | ✅ | ❌ | Gap | Should Have |
| Offline-Modus | ✅ | ❌ | Gap | **Critical** |
| Automatische Fehlerprüfung | ✅ | ❌ | Gap | Should Have |
| Zeiterfassung freigeben (Manager) | ✅ | ❌ | Gap | Should Have |
| Zeiterfassungs-Export | ✅ | ⚠️ Basic | Gap | Must Have |

### 2.3 Rechnungswesen (Invoicing & Accounting)

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Rechnungen erstellen | ✅ | ❌ | **Gap** | **Critical** |
| Angebote/Quotes | ✅ | ❌ | **Gap** | Must Have |
| Abschlagsrechnungen | ✅ | ❌ | **Gap** | Must Have |
| Teilrechnungen | ✅ | ❌ | **Gap** | Should Have |
| Schlussrechnungen | ✅ | ❌ | **Gap** | Should Have |
| Wiederkehrende Rechnungen | ✅ | ❌ | **Gap** | Should Have |
| Dynamische Rechnungspositionen | ✅ | ❌ | **Gap** | Should Have |
| Mahnwesen (automatisch) | ✅ | ❌ | **Gap** | Should Have |
| Mahnvorlagen | ✅ | ❌ | **Gap** | Should Have |
| Rechnungsstatus (Aktiv/Geplant/Hist.) | ✅ | ❌ | **Gap** | Must Have |
| Zahlungseingänge verfolgen | ✅ | ❌ | **Gap** | Should Have |
| Bankanbindung (Abgleich) | ✅ | ❌ | **Gap** | Should Have |
| Camt-Import (Kontoauszug) | ✅ | ❌ | **Gap** | Should Have |
| DATEV-Export | ✅ | ❌ | **Gap** | **Critical** |
| ZUGFeRD-Export | ✅ | ❌ | **Gap** | Must Have |
| X-Rechnung-Export | ✅ | ❌ | **Gap** | Must Have |
| Buchungssätze exportieren | ✅ | ❌ | **Gap** | Should Have |
| Erlöskonten/Gegenkonten | ✅ | ❌ | **Gap** | Should Have |
| Debitorennummern | ✅ | ❌ | **Gap** | Should Have |
| Skonto-Verwaltung | ✅ | ❌ | **Gap** | Should Have |
| Zahlungsbedingungen | ✅ | ❌ | **Gap** | Should Have |
| Rechnungsexport Steuerberater | ✅ | ❌ | **Gap** | Should Have |
| Rechnungsvorlagen | ✅ | ❌ | **Gap** | Should Have |
| E-Mail-Versand Rechnungen | ✅ | ❌ | **Gap** | Must Have |
| Postversand | ✅ | ❌ | **Gap** | Should Have |
| Standardanhänge | ✅ | ❌ | **Gap** | Should Have |
| Preisanpassungen (Massen) | ✅ | ❌ | **Gap** | Should Have |
| Rappenrundung (CH) | ✅ | ❌ | **Gap** | Nice to Have |

### 2.4 Personalwesen (HR / Employees)

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Mitarbeiter anlegen/verwalten | ✅ | ✅ | ✅ | Must Have |
| Mitarbeiter-Import (CSV) | ✅ | ❌ | Gap | Must Have |
| Mitarbeitergruppen | ✅ | ⚠️ Basic | Gap | Should Have |
| Urlaubsanträge | ✅ | ⚠️ Basic | Gap | Must Have |
| Abwesenheiten (Krank etc.) | ✅ | ⚠️ Basic | Gap | Must Have |
| Urlaubsanspruch-Berechnung | ✅ | ❌ | Gap | Must Have |
| Lohnarten definieren | ✅ | ❌ | **Gap** | **Critical** |
| Zuschläge (Nacht/Wochenende/Feiertag) | ✅ | ❌ | **Gap** | **Critical** |
| Lohnabrechnung/Payroll | ✅ | ❌ | **Gap** | **Critical** |
| Arbeitsverträge (App-Zugriff) | ✅ | ❌ | **Gap** | Should Have |
| Verbleibende Urlaubstage (App) | ✅ | ❌ | **Gap** | Should Have |
| Dienstplan (App-Zugriff) | ✅ | ❌ | **Gap** | Should Have |
| Impersonation (Admin) | ❌ | ✅ | ReinPlaner+ | Nice to Have |

### 2.5 Kundenmanagement (CRM)

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Kunden anlegen/verwalten | ✅ | ✅ | ✅ | Must Have |
| Objekte (Locations) pro Kunde | ✅ | ✅ | ✅ | Must Have |
| Kontakte pro Kunde | ✅ | ⚠️ Basic | Gap | Should Have |
| Kundenimport | ✅ | ❌ | Gap | Should Have |
| Eigene Felder (Custom Fields) | ✅ | ❌ | Gap | Should Have |
| Kundenportal (Read-only) | ✅ | ⚠️ Basic | Gap | Should Have |
| Stammdaten-Export | ✅ | ❌ | Gap | Should Have |
| Debitorennummern | ✅ | ❌ | Gap | Should Have |

### 2.6 Material & Tickets

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Artikel/Dienstleistungen anlegen | ✅ | ⚠️ Basic | Gap | Must Have |
| Materialbestellungen | ✅ | ❌ | Gap | Should Have |
| Materialschränke | ✅ | ❌ | Gap | Should Have |
| Ticket-System (Beschwerden) | ✅ | ❌ | **Gap** | Must Have |
| Ticket-Status-Workflow | ✅ | ❌ | **Gap** | Should Have |
| Fotos hinter Einsätzen | ✅ | ❌ | Gap | Should Have |
| Bild-Download (Bulk) | ✅ | ❌ | Gap | Should Have |
| Material-Rechnungsstellung | ✅ | ❌ | Gap | Should Have |

### 2.7 Schnittstellen & Integrationen

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| DATEV-Export | ✅ | ❌ | **Gap** | **Critical** |
| ZUGFeRD/X-Rechnung | ✅ | ❌ | **Gap** | Must Have |
| CSV-Import Stammdaten | ✅ | ❌ | **Gap** | Must Have |
| Open API / REST | ⚠️ Limited | ⚠️ Planned | Gap | Must Have |
| Webhooks | ⚠️ | ❌ | Gap | Should Have |
| Banking API (HBCI/FinTS) | ✅ | ❌ | Gap | Should Have |
| Camt.053/054 Import | ✅ | ❌ | Gap | Should Have |

### 2.8 Mobile App

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| iOS App | ✅ | ❌ | **Gap** | **Critical** |
| Android App | ✅ | ❌ | **Gap** | **Critical** |
| Offline-Modus | ✅ | ❌ | **Gap** | **Critical** |
| Manager-App (zusätzliche Features) | ✅ | ❌ | **Gap** | Should Have |
| Globale Suche (App) | ✅ | ❌ | Gap | Should Have |
| Mobile Einsatzplanung | ✅ | ❌ | Gap | Should Have |
| Echtzeit-Benachrichtigungen | ✅ | ❌ | Gap | Should Have |

### 2.9 Dashboard & Reports

| Feature | pland.app | ReinPlaner | Status | Priority |
|---------|-----------|------------|--------|----------|
| Dashboard mit Stats | ✅ | ✅ | ✅ | Must Have |
| Heutige Einsätze | ✅ | ✅ | ✅ | Must Have |
| Recent Activities | ✅ | ✅ | ✅ | Must Have |
| Performance Overview | ✅ | ✅ | ✅ | Must Have |
| Quick Actions | ✅ | ✅ | ✅ | Must Have |
| Finanzberichte | ✅ | ⚠️ Basic | Gap | Must Have |
| Export-Funktionen | ✅ | ⚠️ CSV | Gap | Should Have |
| Globale Suche | ✅ | ❌ | Gap | Should Have |
| Benutzerdefinierte Spalten | ✅ | ❌ | Gap | Should Have |
| Massenänderungen | ✅ | ❌ | Gap | Should Have |

---

## 3. Gap Analysis

### 3.1 Was hat pland.app das ReinPlaner NICHT hat?

**Critical Gaps (Must Have für Enterprise-Kunden):**
1. **Native Mobile App (iOS/Android)** – pland.app hat echte native Apps mit Offline-Support. ReinPlaner hat nur eine responsive Web-App.
2. **Rechnungswesen komplett** – Rechnungen, Angebote, Mahnungen, ZUGFeRD/X-Rechnung, Datev-Export. Das ist das Herzstück jeder Reinigungsfirma.
3. **Lohnabrechnung/Payroll** – Lohnarten, Zuschläge, Urlaubsanspruch-Berechnung, Abwesenheiten mit Lohnfortzahlung.
4. **Ticket-System** – Beschwerdemanagement mit Fotodokumentation.
5. **CSV-Import** – Stammdaten-Import aus Altsystemen (Mitarbeiter, Kunden, Objekte, Kontakte, Produkte).
6. **Banking-Integration** – Automatischer Rechnungsabgleich über HBCI/FinTS.

**Should Have Gaps:**
- Materialwirtschaft (Bestellungen, Materialschränke)
- Arbeitsscheine (digitale Bestätigung vor Ort)
- Erweiterte Kundenfelder (Custom Fields)
- Manager-App mit erweiterten Funktionen
- GPS-Tracking
- E-Mail/Post-Versand direkt aus dem System

### 3.2 Was hat ReinPlaner das pland.app NICHT hat?

1. **Moderne Tech-Stack** – Next.js 15 + React 19 + TypeScript + TanStack Query v5 vs. ältere Tech-Stack bei pland.app
2. **Multi-Tenant-Architektur** – ReinPlaner ist von Grund auf für Multi-Tenancy ausgelegt (wichtig für SaaS-Skalierung)
3. **Admin Impersonation** – Manager können als Mitarbeiter agieren (hebt ReinPlaner von anderen ab)
4. **Refaktorierte, saubere Codebasis** – Die Architektur-Dokumentation zeigt einen klaren Fokus auf Wartbarkeit
5. **Server Actions + TanStack Query** – Moderne Datenfetching-Patterns
6. **Saubere UI mit shadcn/ui** – Moderne, zugängliche UI-Komponenten
7. **Sentry-Monitoring** – Edge + Server Error Tracking von Anfang an
8. **Transparenteres/Moderneres Pricing** – (noch nicht öffentlich, aber Positionierung als modernere Lösung)

---

## 4. Competitor Analysis

### 4.1 Hauptkonkurrenten (DACH Markt)

| Wettbewerber | Stärken | Schwächen | Preisposition |
|-------------|---------|-----------|---------------|
| **pland.app** | Marktführer, vollständige Suite, native Apps | Veraltete UI, komplex, teuer | Premium (€€€) |
| **Service Fighter** | DACH-Fokus, Service-Software | Nicht reinigungs-spezifisch | Mittel (€€) |
| **Connecteam** | Günstig, einfach | DACH-Schwächen (Steuern, Compliance) | Budget (€) |
| **Deputy** | International, flexibel | Kein DACH-Fokus, keine Rechnungswesen | Mittel (€€) |
| **simPRO** | Enterprise, Handwerk | Überdimensioniert für Reinigung | Premium (€€€) |
| **Quinyx** | KI-Optimierung | Enterprise-fokussiert | Premium (€€€) |

### 4.2 Preis modèle (DACH Cleaning Software)

| Modell | Beispiele | Typische Kosten |
|--------|-----------|----------------|
| **Per Mitarbeiter/Monat** | pland.app, Deputy | €4-15/Mitarbeiter/Monat |
| **Per Benutzer/Monat** | Connecteam | €3-8/Benutzer/Monat |
| **Pauschale + Mitarbeiter** | Service Fighter | €49-199/Monat + €2-5/MA |
| **Enterprise (custom)** | simPRO, Quinyx | Auf Anfrage |
| **Free Tier** | Einige Tools | Limitiert |

> **Hinweis:** Genaue pland.app Preise sind nicht öffentlich kommuniziert. basierend auf User Reviews liegt die Spanne bei ca. €6-12/Mitarbeiter/Monat.

### 4.3 Markttrends

1. **Mobile-First/Mobile-Only** – Immer mehr Reinigungsfirmen wollen nur noch über Smartphone arbeiten
2. **Offline-Fähigkeit** – Kritisch für Reinigungspersonal in Gebäuden ohne stabiles WLAN
3. **KI-Integration** – Routenoptimierung, Nachfrageprognose
4. **DACH-Compliance** – DATEV, XRechnung, GoBD werden Pflicht (esp. für KMUs)
5. **GDPR** – Datenschutz wird wichtiger (v.a. bei großen Kunden)
6. **Integration Ecosystem** – Buchhaltung, HR, CRM-Integrationen werden erwartet
7. **Subscription-Flexibilität** – Monatlich kündbar, skalierbar

---

## 5. Recommendations

### 5.1 Top 5 Features die ReinPlaner BRAUCHT (Priorität)

| # | Feature | Begründung | Effort |
|---|---------|-----------|--------|
| 1 | **Invoicing (Rechnungsstellung)** | Ohne Rechnungen keine paying customers. Minimum: Rechnungen aus Aufträgen generieren, PDF-Export, E-Mail-Versand. | Medium |
| 2 | **Angebote/Quotes** | Vertrieb braucht Angebote. Dynamische Preise aus Arbeitszeiten. | Medium |
| 3 | **Native Mobile App (oder PWA mit Offline)** | Kern-use-case: Mitarbeiter vor Ort. Offline ist kritisch. | **High** |
| 4 | **DATEV-Export** | Deutschland-Pflicht für alle ernsthaften Kunden. ZUGFeRD als Minimum. | Medium |
| 5 | **Urlaub/Krankheit-Management** | HR-Basics für Reinigungsfirmen mit Festangestellten. | Low-Medium |

### 5.2 Differentiator: Was macht ReinPlaner BESSER?

1. **Modernere Architektur** – Next.js 15, React 19, TypeScript, TanStack Query. Wartbarer, zukunftssicher.
2. **Multi-Tenant SaaS** – Von Tag 1 für SaaS-Skalierung gebaut.
3. **Besseres UX** – Saubere, moderne UI (shadcn/ui). Kein Legacy-Code.
4. **Admin Impersonation** – Einzigartiges Feature für Managed-Service-Szenarien.
5. **Open Source/Transparent** – Falls OSS, ein klares Alleinstellungsmerkmal.
6. **GDPR-first** – EU-Datenschutz von Anfang an eingebaut.
7. **Schnellere Entwicklung** – Moderne Tools = schnellere Iteration.

### 5.3 Phasen-Plan (Roadmap-Vorschlag)

**Phase 1 – MVP mit Billing (Nächste 4 Wochen)**
- Rechnungsstellung aus Aufträgen
- PDF-Generierung
- E-Mail-Versand
- Grundlegende Angebote

**Phase 2 – DACH Compliance (Woche 5-8)**
- ZUGFeRD-Export
- X-Rechnung-Export
- Zahlungsbedingungen
- Mahnwesen basics

**Phase 3 – Mobile (Woche 9-16)**
- PWA mit Offline-Cache (Interimslösung)
- React Native App (langfristig)

**Phase 4 – HR/Payroll (Woche 17-24)**
- Urlaubsanträge
- Lohnarten
- Abwesenheiten
- DATEV-Export (echter, nicht nur ZUGFeRD)

**Phase 5 – Enterprise (Wochen 25+)**
- Ticket-System
- Materialwirtschaft
- Banking-Integration
- GPS-Tracking

---

## 6. Quick Wins (Schnelle Vorteile gegenüber pland.app)

1. **Performance** – TanStack Query + Server Actions ist performanter als typische MPA-Architektur
2. **DX (Developer Experience)** – TypeScript + Next.js = besser wartbar
3. **Design System** – shadcn/ui ist moderner als typische Enterprise-UI
4. **Impersonation** – Für Managed-Service-Anbieter (die ReinPlaner als White-Label anbieten) einzigartig nützlich
5. **Multi-Tenancy** – Einfacher mandantenfähiger SaaS ohne technische Schulden

---

## 7. Quellen

- pland.app Help Center: https://help.pland.app/de/
- pland.app Hauptseite: https://pland.app/
- pland.app App Store: https://apps.apple.com/de/app/pland-f%C3%BCr-geb%C3%A4udereiniger/id1421860356
- ReinPlaner Architecture: `/home/ubuntu/ReinPlaner/docs/ARCHITECTURE.md`
- ReinPlaner Dashboard Analysis: `/home/ubuntu/ReinPlaner/docs/ANALYSE_DASHBOARD_MONOLITH.md`

---

*Letzte Aktualisierung: 2026-04-12*
