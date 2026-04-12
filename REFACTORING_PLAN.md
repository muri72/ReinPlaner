# Component Refactoring Plan

**Datum:** 2026-04-12
**Status:** Entwurf
**Priorität:** Hoch

---

## Executive Summary

Die vier größten Komponenten haben insgesamt **4.644 Zeilen Code** und verletzen mehrere SOLID-Prinzipien:

| Komponente | Zeilen | Probleme |
|------------|--------|----------|
| `order-form.tsx` | 1.599 | ~25 Sub-Komponenten vermischt, doppelte Schedule-Logik |
| `create-shift-dialog.tsx` | 1.227 | ~15 Sub-Komponenten vermischt, dupliziert Schedule-Grid |
| `shift-edit-dialog.tsx` | 1.030 | Action-Logik (Edit/Copy/Delete) nicht getrennt |
| `employee-form.tsx` | 788 | Schedule-Editor vermischt mit Form-Logik |

---

## 1. Shared Components (Gemeinsame Komponenten)

### 1.1 `LabelWithRequired` → `/components/ui/label-required.tsx`

**Status:** Doppelt vorhanden (order-form.tsx + employee-form.tsx)
**Aktion:** Extrahieren als wiederverwendbare Komponente

```tsx
// NEUE DATEI: src/components/ui/label-required.tsx
interface LabelRequiredProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function LabelWithRequired({ htmlFor, children, required, className }: LabelRequiredProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        className
      )}
    >
      {children}
    </Label>
  );
}
```

### 1.2 `TimeRangeInputs` → `/components/ui/time-range-inputs.tsx`

**Vorkommen:** create-shift-dialog.tsx (Single Shift Mode), shift-edit-dialog.tsx
**Problem:** Identische Start/End-Time Inputs mit auto-duration Display

```tsx
// NEUE DATEI: src/components/ui/time-range-inputs.tsx
interface TimeRangeInputsProps {
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  travelMinutes?: number;
  breakMinutes?: number;
  showDuration?: boolean;
  showTotalHours?: boolean;
  size?: 'sm' | 'md';
}

export function TimeRangeInputs({ ... }: TimeRangeInputsProps) {
  // Duration auto-calculation
  // Travel/Break inputs
  // Total hours display (duration + travel - break)
}
```

### 1.3 `ScheduleGrid` → `/components/schedule/schedule-grid.tsx`

**Vorkommen:** order-form.tsx, create-shift-dialog.tsx, employee-form.tsx
**Problem:** Drei verschiedene Implementierungen des gleichen Grid-Patterns

```tsx
// NEUE DATEI: src/components/schedule/schedule-grid.tsx

// TYPES (shared across components)
export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DailyScheduleInput {
  hours: number | null;
  start: string | null;
  end: string | null;
}

export interface WeekScheduleInput {
  [key: DayName]: DailyScheduleInput;
}

// KLEINERE VARIANTE: Single Week Schedule (Employee Form)
interface SingleWeekScheduleEditorProps {
  value: WeekScheduleInput;
  onChange: (schedule: WeekScheduleInput) => void;
  objectHours?: Record<DayName, number>; // Optional comparison
  compact?: boolean;
}

// GRÖßERE VARIANTE: Multi-Week Schedule (Order Form)
interface MultiWeekScheduleEditorProps {
  weeks: WeekScheduleInput[];
  onChange: (weeks: WeekScheduleInput[]) => void;
  recurrenceInterval: number;
  startWeekOffset: number;
  objectSchedules?: any[]; // Object's original schedules for comparison
  employeeName?: string;
  onWeekOffsetChange?: (offset: number) => void;
  onIntervalChange?: (interval: number) => void;
}
```

### 1.4 `EmployeeScheduleCard` → `/components/schedule/employee-schedule-card.tsx`

**Vorkommen:** Nur in order-form.tsx
**Problem:**Employee-zugeordneter Schedule-Block mit Woche-intervall + Offset

```tsx
// NEUE DATEI: src/components/schedule/employee-schedule-card.tsx
interface EmployeeScheduleCardProps {
  employee: { id: string; first_name: string; last_name: string };
  assignedSchedules: WeekScheduleInput[];
  recurrenceInterval: number;
  startWeekOffset: number;
  objectSchedules?: any[];
  onSchedulesChange: (schedules: WeekScheduleInput[]) => void;
  onIntervalChange: (interval: number) => void;
  onOffsetChange: (offset: number) => void;
  onRemove: () => void;
  // Validation helpers
  getObjectDailyHours: (weekIndex: number, day: DayName) => number | null;
  getSumAssignedHours: (weekIndex: number, day: DayName) => number;
  isDayValid: (weekIndex: number, day: DayName) => boolean;
  onCopyDayToOthers: (weekIndex: number, sourceDay: DayName) => void;
}
```

### 1.5 `EntitySearchSelect` → `/components/ui/entity-search-select.tsx`

**Vorkommen:** create-shift-dialog.tsx (Object, Order, Employee selection)
**Problem:** Identisches Combobox-Pattern dreifach implementiert

```tsx
// NEUE DATEI: src/components/ui/entity-search-select.tsx
interface EntityOption {
  id: string;
  label: string;
  description?: string;
}

interface EntitySearchSelectProps {
  options: EntityOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onCreateNew?: () => void;
  createNewLabel?: string;
  disabled?: boolean;
  className?: string;
}
```

### 1.6 `HoursCalculator` → `/components/ui/hours-calculator.tsx`

**Vorkommen:** order-form.tsx, employee-form.tsx
**Problem:** Doppelt implementierte Stunden-Berechnung + Anzeige

```tsx
// NEUE DATEI: src/components/ui/hours-calculator.tsx
interface HoursCalculatorProps {
  totalHours: number;
  hourlyRate?: number;
  markupPercentage?: number;
  customRate?: number;
  fixedPrice?: number;
  serviceKey?: string;
  showCalculation?: boolean;
}
```

---

## 2. Custom Hooks

### 2.1 `useScheduleCalculations` → `/hooks/use-schedule-calculations.ts`

**Auszug aus:** order-form.tsx, employee-form.tsx

```tsx
// NEUE DATEI: src/hooks/use-schedule-calculations.ts
interface UseScheduleCalculationsOptions {
  schedules: WeekScheduleInput[];
  recurrenceInterval?: number;
}

export function useScheduleCalculations({ schedules, recurrenceInterval = 1 }: UseScheduleCalculationsOptions) {
  // calculateTotalHoursInCycle()
  // calculateTotalHoursForDay()
  // getSumAssignedHoursForDay()
  // isDailyHoursValid()
  // calculateEndTime() / calculateStartTime()
}
```

### 2.2 `useEmployeeScheduleAssignment` → `/hooks/use-employee-schedule-assignment.ts`

**Auszug aus:** order-form.tsx

```tsx
// NEUE DATEI: src/hooks/use-employee-schedule-assignment.ts
interface UseEmployeeScheduleAssignmentOptions {
  selectedObject: any;
  employees: { id: string; first_name: string; last_name: string }[];
  onAssignmentsChange: (assignments: any[]) => void;
}

export function useEmployeeScheduleAssignment({ ... }: UseEmployeeScheduleAssignmentOptions) {
  // handleEmployeeSelectionChange()
  // initializeEmployeeSchedule()
  // handleAssignedDailyHoursChange()
  // handleCopyDayToOtherDaysInSameWeek()
}
```

---

## 3. Shift-Dialog Refactoring (create-shift-dialog + shift-edit-dialog)

### 3.1 `create-shift-dialog.tsx` → Aufspaltung

```
src/components/shifts/
├── create-shift-dialog.tsx          # Dünn: nur Dialog + Routing
├── single-shift-form.tsx            # Einmaliger Einsatz
├── recurring-shift-form.tsx         # Wiederholender Einsatz  
├── shift-object-order-select.tsx   # Object + Order Auswahl
└── shift-employee-select.tsx       # Mitarbeiter-Auswahl
```

### 3.2 `shift-edit-dialog.tsx` → Action-Komponenten

```
src/components/shifts/
├── shift-edit-dialog.tsx           # Dünn: Dialog-Shell + Shift-Header
├── shift-edit-actions.tsx           # Edit/Copy/Delete Action-Routing
├── shift-edit-form.tsx             # Zeit/Stunden bearbeiten
├── shift-copy-form.tsx              # Kopieren-Form
├── shift-delete-form.tsx            # Löschen-Form mit Modus-Auswahl
├── shift-status-selector.tsx       # Status-Badge/Button Group
└── shift-team-mode.tsx              # Team-Modus Employee-Selection
```

---

## 4. Implementierungs-Reihenfolge (Empfohlen)

### Phase 1: Shared UI Components (1-2 Tage)
1. `LabelWithRequired` extrahieren
2. `TimeRangeInputs` erstellen
3. `EntitySearchSelect` erstellen
4. `HoursCalculator` erstellen

### Phase 2: Schedule Components (2-3 Tage)
1. `ScheduleGrid` (Single-Week) für employee-form.tsx
2. `ScheduleGrid` (Multi-Week) für create-shift-dialog.tsx
3. `EmployeeScheduleCard` für order-form.tsx
4. Hooks: `useScheduleCalculations`, `useEmployeeScheduleAssignment`

### Phase 3: Shift Dialogs (2-3 Tage)
1. `shift-edit-dialog.tsx` in Sub-Komponenten aufteilen
2. `create-shift-dialog.tsx` in Sub-Komponenten aufteilen
3. `ShiftStatusSelector` extrahieren
4. `ShiftActionButtons` extrahieren

### Phase 4: Integration & Testing (2 Tage)
1. Alle Komponenten in ursprüngliche Forms integrieren
2. E2E-Tests für kritische Flows
3. Storybook-Dokumentation

---

## 5. Erwartete Verbesserungen

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Max. Komponentengröße | 1.599 Zeilen | ~400 Zeilen |
| Wiederverwendungsrate | ~30% | ~70% |
| Test-Abdeckung möglich | ~40% | ~80% |
| Duplicate Code | ~15 Blöcke | ~2 Blöcke |

---

## 6. Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|--------|-------------------|---------------|
| Regression bei Integration | Mittel | Detaillierte E2E-Tests, Feature-Flags |
| Performance-Einbußen durch viele Components | Niedrig | React.memo + Virtualisierung wo nötig |
| Breakage bei shared State | Mittel | Gemeinsame Hooks statt Copy-Paste |

---

## 7. Dateistruktur nach Refactoring

```
src/components/
├── ui/
│   ├── label-required.tsx          # NEU
│   ├── time-range-inputs.tsx       # NEU
│   ├── entity-search-select.tsx    # NEU
│   ├── hours-calculator.tsx       # NEU
│   └── [existing ui components...]
├── schedule/
│   ├── schedule-grid.tsx           # NEU
│   ├── employee-schedule-card.tsx  # NEU
│   ├── single-week-editor.tsx      # NEU
│   └── multi-week-editor.tsx       # NEU
├── shifts/
│   ├── create-shift-dialog.tsx    # REFACTORED
│   ├── shift-edit-dialog.tsx      # REFACTORED
│   ├── single-shift-form.tsx      # NEU
│   ├── recurring-shift-form.tsx   # NEU
│   ├── shift-employee-select.tsx  # NEU
│   ├── shift-status-selector.tsx  # NEU
│   └── shift-action-buttons.tsx    # NEU
├── order-form.tsx                  # REFACTORED (wird viel kleiner)
├── employee-form.tsx               # REFACTORED
└── [other components...]

src/hooks/
├── use-schedule-calculations.ts    # NEU
└── use-employee-schedule-assignment.ts  # NEU
```
