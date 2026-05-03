# Gap-Analyse: ReinPlaner vs. PlanD (Konkurrenz)

**Datum:** 01.05.2026  
**Analysiert:** https://pland.app

---

## 🎯 PlanD Hauptfeatures (Was sie bieten)

### 1. Zeitstechung (Time Tracking)
- ✅ GPS-basierte Zeiterfassung direkt am Arbeitsort
- ✅ Mobile App für Mitarbeiter (Android/iOS)
- ✅ Dokumentation von Pausen und Reisezeiten
- ✅ Automatischer Soll/Ist-Vergleich mit Dienstplan
- ✅ Vergessene Stempelungen nachträglich eintragen
- ✅ Leistungsnachweise: Fotos, Kommentare, Unterschriften
- ✅ Export: DATEV, CSV, API

### 2. Dienstplanung (Shift Planning)
- ✅ Employee Roster erstellen
- ✅ Abwesenheitsmanagement (Urlaub, Krankheit)
- ✅ Kommunikation von Schedule-Änderungen
- ✅ Mitarbeiter-App mit Kalenderansicht

### 3. Payroll (Lohnabrechnung)
- ✅ Nacht-, Feiertags-, Gefahrenzuschläge definierbar
- ✅ Automatische Berechnung
- ✅ DATEV-Export
- ✅ Automatische Export für Lohnbüro

### 4. Invoicing (Rechnungsstellung)
- ✅ Wiederkehrende Rechnungen
- ✅ Teil- und Schlussrechnungen
- ✅ Stornorechnungen & Gutschriften
- ✅ Mahnwesen mit einstellbaren Stufen
- ✅ Automatische Zahlungserinnerungen

### 5. KI-Assistenz
- ✅ KI-Telefonassistenz "Paula" für Betrieb

### 6. Employee App
- ✅ Ganze Firma in einer App
- ✅ GPS-Tracking
- ✅ Urlaubskonto-Anzeige
- ✅ Schedule immer in der Hosentasche

---

## 📊 ReinPlaner Feature-Gaps

| Feature | PlanD | ReinPlaner | Status |
|---------|-------|------------|--------|
| **Mobile Employee App** | ✅ Ja | ❌ Fehlt | 🔴 KRITISCH |
| **GPS-basierte Zeiterfassung** | ✅ Ja | ❌ Fehlt | 🔴 KRITISCH |
| **Dienstplanung/Schichtplan** | ✅ Ja | ⚠️ Basic | 🟡 Aufbauen |
| **Urlaub/Krankheit Management** | ✅ Ja | ⚠️ Basic | 🟡 Aufbauen |
| **Abwesenheitsmanagement** | ✅ Ja | ❌ Fehlt | 🔴 Fehlt |
| **Lohnabrechnung mit Zuschlägen** | ✅ Ja | ⚠️ Invoice nur | 🟡 Aufbauen |
| **DATEV-Export** | ✅ Ja | ❌ Fehlt | 🔴 Fehlt |
| **Wiederkehrende Rechnungen** | ✅ Ja | ⚠️ Manual | 🟡 Aufbauen |
| **Mahnwesen automatisch** | ✅ Ja | ✅ Cron-basiert (3-stufig) | 🟢 DONE (PR#6) |
| **Zahlungserinnerungen** | ✅ Ja | ❌ Fehlt | 🔴 Fehlt |
| **Leistungsnachweise (Fotos)** | ✅ Ja | ❌ Fehlt | 🔴 Fehlt |
| **KI-Assistent/Telefon** | ✅ Paula | ❌ Fehlt | 🔴 Fehlt |
| **Inventar-Management** | ✅ Ja | ❌ Fehlt | 🟠 Optional |
| **Qualitätsmanagement** | ✅ Ja | ⚠️ Checklisten | 🟡 Aufbauen |

---

## 🔴 Top 5 fehlende Features (Priorität)

### 1. Mobile Employee App
**Warum:** PlanD's wichtigstes Differenzierungsmerkmal. Mitarbeiter können direkt am Standort stempeln.

**Was fehlt:**
- Employee Self-Service App
- Zeiterfassung ohne Desktop
- Urlaubsanträge mobil
- Push-Notifications für Schichtänderungen

**Impact:** Hoch - konkurrenzfähig nur mit mobiler Lösung

### 2. GPS-basierte Zeiterfassung
**Warum:** "Location-based time recording ensures that your employees are always at the right location"

**Was fehlt:**
- Standort-Validierung beim Stempeln
- Geo-Fencing für Kundenstandorte
- Alarm bei Abweichung (Mitarbeiter nicht am richtigen Ort)

**Impact:** Hoch - Qualitätskontrolle & Missbrauchsschutz

### 3. Automatisches Mahnwesen
**Warum:** "PlanD also automatically reminds your customers of outstanding payments and has an efficient dunning system"

**Was fehlt:**
- Automatische Mahn-Generation
- Konfigurierbare Mahnstufen
- Mahlgebühren berechnen
- Automatische Zahlungserinnerungen

**Impact:** Mittel - Cashflow Problem

### 4. DATEV-Export
**Warum:** "Easily export wage data... As a DATEV, CSV file, customized export or direct API interface"

**Was fehlt:**
- DATEV-Schnittstelle für Lohnbuchhaltung
- Strukturierte Export-Formate
- API für Drittsysteme

**Impact:** Mittel - manuelle Buchhaltung

### 5. Wiederkehrende Rechnungen & Teilrechnungen
**Warum:** "Whether recurring, instalment/partial or final invoices"

**Was fehlt:**
- Recurring Invoice Automation
- Abschlagsrechnungen
- Automatische Generierung bei Periodenende

**Impact:** Mittel - manueler Aufwand

---

## 🟡 Mittelfristige Features (6-12 Monate)

### Qualitätsmanagement
- Digitale Leistungsnachweise (Fotos, Unterschriften)
- Checklisten mit Erinnerungen
- Bewertungssystem

### Inventar-Management
- Verbrauchsmaterial-Verfolgung
- Bestellautomatisierung
- Lagerbestand

### KI-Assistent
- Telefon-Assistant (wie Paula)
- Chatbot für Mitarbeiter
- Automatische Terminplanung

---

## 📋 Empfohlene Roadmap

### Phase 1 (1-2 Monate) - Mobile Basis
- [ ] React Native App für Mitarbeiter
- [ ] Zeiterfassung ohne Desktop
- [ ] Push-Notifications

### Phase 2 (2-3 Monate) - GPS & Validation
- [ ] Standort-Tracking
- [ ] Geo-Fencing für Einsatzorte
- [ ] Abweichungs-Alerts

### Phase 3 (3-4 Monate) - Business Logic
- [ ] Wiederkehrende Rechnungen
- [ ] Automatisches Mahnwesen
- [ ] DATEV-Export

### Phase 4 (4-6 Monate) - Differenzierung
- [ ] KI-Assistent
- [ ] Inventar-Management
- [ ] Qualitätsnachweise digital

---

## 💡 Quick Wins (1-2 Wochen)

1. **Rechnungsautomation** - Cron-Job für wiederkehrende Rechnungen
2. **Mahnungstemplate** - E-Mail mit Fälligkeitserinnerung
3. **CSV-Export** - Payroll-Daten exportieren
4. **Urlaubsantrag-Flow** - Genehmigungsworkflow
5. **Checklisten mit Fotos** - Qualitätsdokumentation

---

## ⚡ Konkurrenz-Analyse Zusammenfassung

| Aspekt | PlanD | ReinPlaner Gap |
|--------|-------|----------------|
| Positioning | "All-In-One für innovative Reinigungsfirmen" | ⚠️ ähnlich, aber weniger Features |
| Target | Mittelgroße Reinigungsfirmen | ✅ gleiche Zielgruppe |
| Mobile |✅ Native App mit GPS | ❌ nur Desktop |
| Preis | nicht öffentlich, Enterprise-Focus | ⚠️ unbekannt |
| USP | GPS-Tracking, KI-Assistent | ⚠️ noch kein klares Alleinstellungsmerkmal |

---

## 🎯 Fazit

**ReinPlaner ist gut positioniert**, aber hinkt bei **mobilen Features** und **Automatisierung** hinter PlanD her.

**Kritische Lücken:**
1. Mobile Employee App (INNERHALB von 2 Monaten starten)
2. GPS-basierte Zeiterfassung
3. Mahnwesen-Automation

**Empfehlung:** Mobile App ist Top-Priorität. Ohne mobile Lösung für Mitarbeiter ist ReinPlaner für mittelgroße Firmen unattraktiv.