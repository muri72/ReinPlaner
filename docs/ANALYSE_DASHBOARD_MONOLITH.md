# Analyse: dashboard/page.tsx Monolith

**Datei:** `src/app/dashboard/page.tsx`  
**Zeilen:** 526  
**Letzte Analyse:** 2026-04-12

---

## 1. Was macht diese Datei?

Die `DashboardPage` ist die Haupt-Dashboard-Seite für authentifizierte Benutzer. Sie zeigt eine Übersicht mit:

### Hauptfunktionen:
- **Willkommen-Header** mit dynamischem Datum (deutsches Format)
- **"Heutige Einsätze" Section** (importierte Komponente `TodaysOrdersOverview`)
- **Quick Stats Grid** (5 StatCards: Aktive/Abg. Aufträge, Mitarbeiter aktiv, Ausstehende Anfragen, Neue Beschwerden)
- **Aktuelle Aktivitäten** (letzte 5 Activities aus `recentActivities`)
- **Anstehende Aufgaben** (nächste 7 Tage, mit Prioritäts-Badges)
- **Performance Overview** (4 Cards: Geplante Aufträge, Mitarbeiter gesamt, Kunden gesamt, Beschwerden heute)
- **Quick Actions** (Buttons zu Orders, Employees, Planning, Reports)

### Datenfluss:
1. `useUserProfile()` Hook lädt User-Context
2. `getSuperOptimizedDashboardData()` lädt alle Dashboard-Daten (Server Action)
3. Memoized Processing: `processedDashboardData`, `stats`
4. Loading States für alle Sections
5. Error Handling via Sentry + lokale Fehleranzeige

---

## 2. State-Management Logik

### Lokaler State:
```typescript
const [dashboardData, setDashboardData] = useState<any>(null);
const [dataLoading, setDataLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### External State (via Hooks):
- `useUserProfile()` → `userProfile`, `currentUserRole`, `displayName`, `loading`, `authenticated`, `refresh`
- `useRouter()` → Navigation
- `createClient()` → Supabase Client (aber nur für potentiellen zukünftigen Gebrauch)

### Memoized Calculations:
- `processedDashboardData` - sliced/limitiert Daten
- `stats` - formatierte Statistik-Cards
- `loadingStats` - Skeleton-Daten
- `formattedDate` - formatiertes Datum

---

## 3. API Calls

### Server Action:
```typescript
getSuperOptimizedDashboardData() // aus @/lib/super-optimized-dashboard
```
**Was sie holt (laut Quellcode):**
- `customerCount`, `objectCount`, `employeeCount`
- `pendingRequestsCount`, `activeEmployeesCount`
- `totalScheduledToday`, `completedScheduledToday`
- `totalNewComplaintsToday`
- `revenueLast7Days`
- `scheduledOrdersToday`
- `recentActivities` (slice 0-5)
- `upcomingTasks` (slice 0-5)
- `feedback` (slice 0-3)
- `statusCounts` (pending, completed)

### Importierte aber ungenutzte Funktion:
```typescript
getUnresolvedFeedback // importiert aber nie verwendet
```

---

## 4. Identifizierte UI Sections (Candidate Components)

| Section | Current Implementation | Extraktion |
|---------|------------------------|------------|
| **WelcomeHeader** | Inline JSX + Loading Skeleton | `DashboardWelcomeHeader.tsx` |
| **QuickStatsGrid** | 5 StatCards mit Loading State | `DashboardQuickStats.tsx` |
| **RecentActivities** | Card mit map() | `DashboardRecentActivities.tsx` |
| **UpcomingTasks** | Card mit map() + Priority Badges | `DashboardUpcomingTasks.tsx` |
| **PerformanceOverview** | 4 Cards | `DashboardPerformanceOverview.tsx` |
| **QuickActions** | Button Group | `DashboardQuickActions.tsx` |
| **ErrorDisplay** | Conditional Card | `DashboardError.tsx` |

### Bereits ausgelagert:
- `TodaysOrdersOverview` → `/components/todays-orders-overview.tsx`

---

## 5. Refactoring-Vorschlag (Kleine PRs)

### PR 1: `DashboardWelcomeHeader` extrahieren
**Datei:** `src/components/dashboard/dashboard-welcome-header.tsx`
- Willkommen-Text + Datum
- Loading Skeleton
- **Keine Props nötig** (nutzt `useUserProfile()` intern)

### PR 2: `DashboardQuickStats` extrahieren
**Datei:** `src/components/dashboard/dashboard-quick-stats.tsx`
- Props: `{ stats: Stat[], dataLoading: boolean }`
- Extrahiert Loading Skeleton Logik

### PR 3: `DashboardRecentActivities` extrahieren
**Datei:** `src/components/dashboard/dashboard-recent-activities.tsx`
- Props: `{ activities: Activity[], dataLoading: boolean }`
- Formatted Date + Icon

### PR 4: `DashboardUpcomingTasks` extrahieren
**Datei:** `src/components/dashboard/dashboard-upcoming-tasks.tsx`
- Props: `{ tasks: Task[], dataLoading: boolean }`
- Priority Badge Logik

### PR 5: `DashboardPerformanceOverview` extrahieren
**Datei:** `src/components/dashboard/dashboard-performance-overview.tsx`
- Props: `{ data: PerformanceData, dataLoading: boolean }`

### PR 6: `DashboardQuickActions` extrahieren
**Datei:** `src/components/dashboard/dashboard-quick-actions.tsx`
- **Keine Props nötig** (nutzt `useRouter()` intern)

### PR 7: `DashboardError` extrahieren + Cleanup
**Datei:** `src/components/dashboard/dashboard-error.tsx`
- Props: `{ error: string | null }`

### PR 8: Finales Refactoring
- `DashboardClient` Komponente erstellen
- `DashboardPage` wird zum reinen Server Component
- Exportierte Sub-Komponenten in `index.ts` bündeln

---

## 6. Empfehlungen

### Sofort:
1. **`getUnresolvedFeedback` Import entfernen** (ungenutzt)
2. **TypeScript Types definieren** (`DashboardStats`, `Activity`, `Task` Interfaces)
3. **Komponente `TodaysOrdersOverview` prüfen** - wird importiert, könnte weitere Extraktionen benötigen

### Mittelfristig:
1. **Dashboard-Component Bibliothek erstellen** (`src/components/dashboard/`)
2. **Gemeinsames `DashboardProvider` Context** für `dataLoading` und `error` State
3. **Lazy Loading** für schwere Sections (RecentActivities, UpcomingTasks)

### Testing Strategy:
- Jede extrahierte Komponente braucht Unit Tests
- Integrationstest für `DashboardPage` die alle Components orchestriert
- Snapshot Tests für Loading States

---

## 7. Dateistruktur nach Refactoring

```
src/components/dashboard/
├── index.ts                          # Barrel Export
├── dashboard-welcome-header.tsx      # PR 1
├── dashboard-quick-stats.tsx         # PR 2
├── dashboard-recent-activities.tsx    # PR 3
├── dashboard-upcoming-tasks.tsx        # PR 4
├── dashboard-performance-overview.tsx # PR 5
├── dashboard-quick-actions.tsx        # PR 6
└── dashboard-error.tsx               # PR 7

src/app/dashboard/
├── page.tsx                          # Server Component (PR 8)
└── dashboard-client.tsx              # Client Component (PR 8)
```

---

## 8. Metriken

| Metric | Value |
|--------|-------|
| Gesamtzeilen | 526 |
| JSX-Zeilen | ~300 |
| Logik-Zeilen | ~100 |
| Import-Zeilen | 18 |
| Extraktionen möglich | 7 |
| Ungenutzte Imports | 1 (`getUnresolvedFeedback`) |
