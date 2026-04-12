# Analyse: Dashboard Monolith (page.tsx)

> **Hinweis:** Die genannte Datei `src/app/dashboard/page.tsx` hat **526 Zeilen** (nicht 19.400 wie im Task angegeben). Die Analyse bezieht sich auf diese Datei sowie die zugehörige Daten-Library.

---

## 1. Was macht diese Datei?

Die `DashboardPage` ist die Hauptübersichtsseite für authentifizierte Benutzer und zeigt:

### Kernfunktionen:
- **Willkommens-Header** mit aktuellem Datum und Benutzername
- **TodaysOrdersOverview** - Heutige Einsätze (separate Komponente)
- **5 KPI-Statistiken:** Aktive/Abgeschlossene Aufträge, aktive Mitarbeiter, ausstehende Anfragen, neue Beschwerden
- **Aktuelle Aktivitäten** - Die letzten 5 Activity-Einträge
- **Anstehende Aufgaben** - Die nächsten 5 Aufgaben mit Fälligkeitsdatum und Priorität
- **Performance-Übersicht:** Geplante/abgeschlossene Aufträge heute, Mitarbeiter/Kunden gesamt, Beschwerden
- **Quick Actions** - Buttons zu Orders, Employees, Planning, Reports

### Datenfluss:
```
useUserProfile (Context)
       ↓
getSuperOptimizedDashboardData() (lib)
       ↓
processedDashboardData (useMemo)
       ↓
stats, activities, tasks (useMemo)
       ↓
UI Render
```

---

## 2. State-Management Logik

| State | Typ | Zweck |
|-------|-----|-------|
| `dashboardData` | `useState<any>` | Rohdaten vom API |
| `dataLoading` | `useState<boolean>` | Ladezustand |
| `error` | `useState<string \| null>` | Fehlermeldung |
| `userProfile` | Context | Authentifizierter User |
| `currentUserRole` | Context | Rolle des Users |

**Memoization:**
- `processedDashboardData` (useMemo) - Filtert Activities/Tasks auf 5 Einträge
- `stats` (useMemo) - Berechnet KPI-Karten aus dashboardData
- `formattedDate` (useMemo) - Formatiert Datum mit date-fns

---

## 3. API Calls

**Primärer Call:**
```typescript
getSuperOptimizedDashboardData() 
→ src/lib/super-optimized-dashboard.ts (276 Zeilen)
```

Diese Funktion aggregiert:
- `statusCounts` - Auftragsstatus-Zahlen
- `activeEmployeesCount` - Aktive Mitarbeiter
- `completedScheduledToday` - Abgeschlossene Einsätze heute
- `pendingRequestsCount` - Ausstehende Anfragen
- `employeeCount` - Mitarbeiter gesamt
- `totalScheduledToday` - Geplante Einsätze heute
- `revenueLast7Days` - Umsatz letzte 7 Tage
- `totalNewComplaintsToday` - Neue Beschwerden heute
- `recentActivities` - Letzte Aktivitäten
- `upcomingTasks` - Anstehende Aufgaben

---

## 4. Extrahierbare Section-Komponenten

### Phase 1: Klein (Low-Hanging Fruit)

| Komponente | Vorschlag | LOC |
|------------|-----------|-----|
| `DashboardHeader` | Willkommens-Header mit Datum | ~20 |
| `QuickStatsGrid` | 5 KPI-Karten Grid | ~40 |
| `RecentActivitiesList` | Aktuelle Aktivitäten | ~30 |
| `UpcomingTasksList` | Anstehende Aufgaben | ~35 |
| `PerformanceOverview` | 4 Performance-Karten | ~35 |
| `QuickActions` | Action-Buttons | ~8 |

### Phase 2: Mittlere Komplexität

| Komponente | Vorschlag | LOC |
|------------|-----------|-----|
| `DashboardError` | Error-Card für Fehlermeldungen | ~8 |
| `DashboardLoading` | Loading-Skeletons | ~30 |
| `StatsCard` | Wiederverwendbare Stat-Karte | ~15 |

### Phase 3: Größere Umstrukturierung

| Komponente | Vorschlag | LOC |
|------------|-----------|-----|
| `DashboardDataProvider` | Data-Fetching Hook auslagern | ~30 |
| `useDashboardStats` | Custom Hook für Stats-Berechnung | ~25 |

---

## 5. Refactoring-Vorschlag: Schrittweise PRs

### PR #1: Loading/Error States auslagern
**Dateien:** `src/components/dashboard-loading.tsx`, `src/components/dashboard-error.tsx`
- Extrahieren der Loading-Skeletons
- Extrahieren der Error-Card
- **Risk:** Low

### PR #2: StatCard als wiederverwendbare Komponente
**Dateien:** `src/components/stat-card.tsx`
- Interne `stats.map()` Logik wird wiederverwendbar
- Props: title, value, change, changeType, icon, description
- **Risk:** Low

### PR #3: Dashboard-Sections in eigene Dateien
**Dateien:** `src/components/dashboard/sections/`
- `recent-activities.tsx`
- `upcoming-tasks.tsx`
- `performance-overview.tsx`
- `quick-actions.tsx`
- **Risk:** Low

### PR #4: Custom Hooks für Data-Handling
**Dateien:** `src/hooks/use-dashboard-stats.ts`
- `useDashboardData()` - Data-Fetching Logic
- `useDashboardStats()` - Stats-Berechnung
- **Risk:** Medium (verändert State-Logik)

### PR #5: Main Page Cleanup
**Dateien:** `src/app/dashboard/page.tsx`
- Importiert alle neuen Komponenten
- Reduziert auf ~100 Zeilen
- **Risk:** Low

---

## 6. Aktuelle Code-Probleme

1. **Any-Typ:** `dashboardData: any` - sollte typisiert werden
2. **Magic Numbers:** `slice(0, 5)` mehrfach wiederholt
3. **Keine Fehlerbehandlung für `getSuperOptimizedDashboardData`:** Nur catch-Block, kein Retry
4. **Fragmentierte Loading-States:** Mehrfache `dataLoading` Checks
5. **Hardcodierte deutsche Texte:** Sollten i18n-extraktiert werden

---

## 7. Empfohlene Reihenfolge

```
PR #1 (Load/Error) → PR #2 (StatCard) → PR #3 (Sections) → PR #4 (Hooks) → PR #5 (Cleanup)
```

Jeder PR ist eigenständig testbar und reduziert die Komplexität schrittweise.

---

*Analyse erstellt am: 2026-04-12*
