# TEST_STRATEGY.md - Dashboard Testing

## Übersicht

Dieses Dokument definiert die Teststrategie für das dyad-aris-dashboard.

---

## 1. Unit Tests

### Priorität: Utility Functions

| Modul | Tests | Priorität |
|-------|-------|-----------|
| `src/lib/date-utils.ts` | `isGermanHoliday`, `getDateStyling`, `getHolidayTooltip` | 🔴 Hoch |
| `src/lib/utils/date-utils.ts` | Datumsformatierung, Kalenderwochen | 🔴 Hoch |
| `src/lib/utils/employee-utils.ts` | Employee-Validierung, Rollen-Parsing | 🟡 Mittel |
| `src/lib/utils/time-tracking-utils.ts` | Zeitberechnungen, Überstunden | 🟡 Mittel |
| `src/lib/utils/form-utils.ts` | Form-Validierungshilfen | 🟢 Niedrig |
| `src/lib/utils/holiday-helpers.ts` | Feiertagsberechnung | 🔴 Hoch |

### Test-Frameworks
- **Vitest** (bevorzugt für Next.js 14+)
- Alternativ: **Jest** mit ts-jest

---

## 2. Integration Tests (Server Actions)

### Priorität: Server Actions

| Action | Was testen | Priorität |
|--------|-------------|-----------|
| `src/lib/actions/shift-planning.ts` | Schichtplanung, Zuweisungen, Konflikte | 🔴 Hoch |
| `src/lib/actions/notifications.ts` | Notification-Versand, Template-Rendering | 🟡 Mittel |
| `src/lib/actions/finances.ts` | Finanzberechnungen, Reports | 🟡 Mittel |
| `src/lib/actions/impersonation.ts` | User-Impersonation, Rechte | 🔴 Hoch |

### Test-Ansatz
- Server Actions direkt invoke mit `unstable_noStore()` für DB-Mocks
- Supabase-Client mocken mit `@supabase/ssr` Testing Helpers

---

## 3. E2E Tests (Critical User Flows)

### Priorität 1: Kritische Flows 🔴

| Flow | Beschreibung | Playwright Tests |
|------|--------------|-------------------|
| **Login/Logout** | Auth-Flow, Session-Handling | `auth.spec.ts` |
| **Dashboard Loading** | Hauptseite, Daten laden, Fehlerbehandlung | `dashboard.spec.ts` |
| **Shift Planning** | Schichten erstellen, bearbeiten, löschen | `shift-planning.spec.ts` |
| **Employee Management** | Mitarbeiter anlegen, bearbeiten | `employees.spec.ts` |

### Priorität 2: Wichtige Flows 🟡

| Flow | Beschreibung |
|------|--------------|
| **Order Management** | Aufträge erstellen, Status ändern |
| **Customer Contacts** | Kontakte pflegen |
| **Time Tracking** | Arbeitszeiten erfassen |
| **Notifications** | Benachrichtigungen lesen/verwalten |

### Priorität 3: Randflüsse 🟢

| Flow | Beschreibung |
|------|--------------|
| **Settings** | Einstellungen ändern |
| **Audit Logs** | Log-Auswertung |
| **Reports** | Report-Generierung |

---

## 4. Pages & Components Tests

### Pages mit Test-Bedarf

```
src/app/dashboard/
├── page.tsx                    # Haupt-Dashboard → E2E
├── employees/                  # Mitarbeiter-Verwaltung → E2E
├── orders/                     # Aufträge → E2E
├── shift-planning/             # Schichtplanung → E2E + Integration
├── time-tracking/              # Zeiterfassung → E2E
├── notifications/               # → Integration
├── audit-logs/                 # → Integration
└── reports/                    # → E2E
```

### Components mit Test-Bedarf

| Component | Test-Typ | Grund |
|-----------|----------|-------|
| `ui/button.tsx` | Unit | Varianten, States |
| `ui/form.tsx` | Unit | Validierung |
| `ui/dialog.tsx` | Unit | Animation, Accessibility |
| `ui/table.tsx` | Unit | Sorting, Filtering |
| `ui/calendar.tsx` | Integration | Datums-Selection, Feiertage |
| `customer-form.tsx` | Integration | Form-Submission |
| `user-form.tsx` | Integration | User-Creation |

---

## 5. Test-Abdeckungs-Ziele

| Kategorie | Ziel |
|-----------|------|
| Utility Functions | ≥90% Coverage |
| Server Actions | ≥80% Coverage |
| UI Components | ≥70% Coverage |
| Pages (E2E) | Kritische Flows 100% |

---

## 6. Empfohlene Test-Reihenfolge

1. **date-utils** → Osterberechnung, Feiertage
2. **shift-planning actions** → Server Action Tests
3. **Dashboard page** → E2E Tests
4. **UI Components** → Unit Tests
5. **Integration Tests** → Form-Submissions
