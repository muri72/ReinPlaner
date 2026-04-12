# ARIS API Reference – Server Actions

> **Last updated:** 2026-04-12

All mutations in ARIS go through **Server Actions** (`"use server"`). They run on the server with full Supabase Admin access and return `{ success: boolean; message: string; ... }`.

**Response pattern:**
```typescript
{ success: true, message: "..." }        // Success
{ success: false, message: "Error: ..." } // Error (always includes message)
```

---

## Table of Contents

1. [Shift Planning (`lib/actions/shift-planning.ts`)](#1-shift-planning)
2. [Planning (`dashboard/planning/actions.ts`)](#2-planning-dashboardplanningactionsts)
3. [Time Tracking (`dashboard/time-tracking/actions.ts`)](#3-time-tracking-dashboardtime-trackingactionsts)
4. [Orders (`dashboard/orders/actions.ts`)](#4-orders-dashboardordersactionsts)
5. [Employees (`dashboard/employees/actions.ts`)](#5-employees-dashboardemployeesactionsts)
6. [Customers (`dashboard/customers/actions.ts`)](#6-customers-dashboardcustomersactionsts)
7. [Objects (`dashboard/objects/actions.ts`)](#7-objects-dashboardobjectsactionsts)
8. [Users (`dashboard/users/actions.ts`)](#8-users-dashboardusersactionsts)
9. [Absence Requests (`dashboard/absence-requests/actions.ts`)](#9-absence-requests-dashboardabsence-requestsactionsts)
10. [Notifications (`lib/actions/notifications.ts`)](#10-notifications-libactionsnotifications)
11. [Finances (`lib/actions/finances.ts`)](#11-finances-libactionsfinances)
12. [Impersonation (`lib/actions/impersonation.ts`)](#12-impersonation-libactionsimpersonation)

---

## 1. Shift Planning (`lib/actions/shift-planning.ts`)

Core shift planning actions. All functions use `createAdminClient()` for full DB access.

---

### `getShiftPlanningData`

Fetches planning calendar data for a date range: employees, shifts, absences, and unassigned orders.

```typescript
export async function getShiftPlanningData(
  startDate: Date,
  endDate: Date,
  filters: {
    query?: string;
    filters?: PlanningFilters;
  }
): Promise<{
  success: boolean;
  data: ShiftPlanningPageData | null;
  message: string;
}>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `startDate` | `Date` | Start of the planning period (Monday) |
| `endDate` | `Date` | End of the planning period (Sunday) |
| `filters.query` | `string` | Free-text search on employee first/last name |
| `filters.filters.employeeGroups` | `string[]` | Filter by employee group IDs |
| `filters.filters.objects` | `string[]` | Filter by object IDs |
| `filters.filters.services` | `string[]` | Filter by service IDs |
| `filters.filters.experienceLevel` | `string` | Filter by required experience level |
| `filters.filters.showAvailableOnly` | `boolean` | Show only available employees |
| `filters.filters.shiftStatus` | `string` | Filter by shift status (`scheduled`, `in_progress`, `completed`, `cancelled`) |

**Returns:**

```typescript
interface ShiftPlanningPageData {
  planningData: ShiftPlanningData;   // { [employeeId]: EmployeeShiftData }
  unassignedShifts: UnassignedShift[];
  weekNumber: number;
}

interface EmployeeShiftData {
  name: string;
  avatar_url: string | null;
  job_title: string | null;
  totalHoursAvailable: number;
  totalHoursPlanned: number;
  raw: any;
  schedule: {
    [date: string]: {
      isAvailable: boolean;
      totalHours: number;
      availableHours: number;
      isAbsence: boolean;
      absenceType: string | null;
      shifts: ShiftAssignment[];
    };
  };
}

interface ShiftAssignment {
  id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  estimated_hours: number;
  travel_time_minutes: number | null;
  break_time_minutes: number | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  is_detached_from_series: boolean;
  job_id: string;
  job_title: string;
  priority: string;
  object_id: string | null;
  object_name: string | null;
  object_address: string | null;
  service_id: string | null;
  service_title: string | null;
  service_color: string | null;
  series_id: string | null;
  is_recurring: boolean;
  order_id: string | null;
  employees: ShiftEmployee[];
  is_team: boolean;
  is_multi_shift: boolean;
  assignment_id: string | null;
}

interface ShiftEmployee {
  employee_id: string;
  employee_name: string;
  avatar_url?: string;
  role: "worker" | "team_lead" | "substitute";
  is_confirmed: boolean;
}
```

**Side effects:** Calls `revalidatePath("/dashboard/planning")` on success.

---

### `assignEmployeeToShift`

Assigns a single employee to an existing shift. Checks for time conflicts.

```typescript
export async function assignEmployeeToShift(
  shiftId: string,
  employeeId: string,
  role?: "worker" | "team_lead" | "substitute"
): Promise<{ success: boolean; message: string }>
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `shiftId` | `string` | — | ID of the shift to assign to |
| `employeeId` | `string` | — | Employee ID |
| `role` | `"worker" \| "team_lead" \| "substitute"` | `"worker"` | Employee role on this shift |

**Errors:** `"Benutzer nicht authentifiziert."` | `"Mitarbeiter ist bereits zugewiesen."` | Overlap conflict message

**Side effects:** Sends a push notification to the employee. Calls `revalidatePath("/dashboard/planning")`.

---

### `reassignShift`

Reassigns an employee to a different shift (or multiple future shifts in a series).

```typescript
type ShiftSeriesEditMode = "single" | "future" | "all";

export async function reassignShift(
  shiftId: string,
  newEmployeeId: string,
  mode?: ShiftSeriesEditMode
): Promise<{ success: boolean; message: string; affectedCount?: number }>
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `shiftId` | `string` | — | ID of the shift to reassign |
| `newEmployeeId` | `string` | — | Target employee ID |
| `mode` | `"single" \| "future" \| "all"` | `"single"` | `single`: only this shift. `future`: this + all future shifts in series. `all`: entire series. |

**Side effects:** Calls `revalidatePath("/dashboard/planning")`.

---

### `updateShiftStatus`

Updates the status of a shift. When status becomes `completed`, automatically generates time entries.

```typescript
export async function updateShiftStatus(
  shiftId: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
): Promise<{ success: boolean; message: string }>
```

**Side effects:** When `status === "completed"`: sets `completed_at`, calls `generateTimeEntriesForShift()`, then `revalidatePath("/dashboard/planning")`.

---

### `syncAssignmentToShifts`

Synchronizes an `order_employee_assignments` change (employee reassignment) back to all already-generated shift records. Solves the "two truths" problem.

```typescript
export async function syncAssignmentToShifts(
  assignmentId: string,
  newEmployeeId: string,
  mode?: "future" | "all"
): Promise<{ success: boolean; message: string; updated_count: number }>
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `assignmentId` | `string` | — | Assignment ID |
| `newEmployeeId` | `string` | — | New employee to assign |
| `mode` | `"future" \| "all"` | `"future"` | `future`: from today onward. `all`: entire assignment history. |

---

### `deleteShift`

Permanently deletes a single shift and its `shift_employees` and `time_entries` records.

```typescript
export async function deleteShift(
  shiftId: string,
  shiftDate: string,
  notes?: string
): Promise<{ success: boolean; message: string }>
```

**Side effects:** Deletes in correct order (child tables first → parent table) to avoid FK violations. Calls `revalidatePath("/dashboard/planning")`.

---

### `deleteSeries`

Deletes shifts belonging to a recurring assignment series.

```typescript
type SeriesDeleteMode = "single" | "future" | "all";

export async function deleteSeries(
  assignmentId: string,
  mode?: SeriesDeleteMode,
  fromDate?: string,
  skipAutoGeneration?: boolean
): Promise<{ success: boolean; message: string }>
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `assignmentId` | `string` | — | Assignment ID (all related assignments for the same order are included) |
| `mode` | `"single" \| "future" \| "all"` | `"future"` | Which shifts to delete |
| `fromDate` | `string` | — | Start date for `single` and `future` modes (ISO date string) |
| `skipAutoGeneration` | `boolean` | `true` | Prevents re-triggering auto-generation |

**Note:** `mode = "future"` skips completed shifts. `mode = "all"` marks the assignment as `deleted: true`.

---

### `reassignAssignment`

Reassigns a recurring shift series (or single occurrence) to a different employee. Handles three scenarios:
1. Same employee, same date → no-op
2. Same employee, different date → moves the single occurrence
3. Different employee → creates/updates assignment and override records

```typescript
type AssignmentEditMode = "single" | "future" | "all";

export async function reassignAssignment(
  assignmentId: string,
  newEmployeeId: string,
  mode?: AssignmentEditMode,
  shiftDate?: string,
  shiftTimes?: { start: string; end: string; hours: number },
  originalShiftDate?: string
): Promise<{ success: boolean; message: string }>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `assignmentId` | `string` | Assignment to modify |
| `newEmployeeId` | `string` | Target employee |
| `mode` | `"single" \| "future" \| "all"` | Scope of change |
| `shiftDate` | `string` | Target date for single-mode moves |
| `shiftTimes` | `{ start, end, hours }` | Override shift times |
| `originalShiftDate` | `string` | Source date (for detecting same-employee moves) |

---

### `copyAssignment`

Creates a duplicate assignment for a different employee. Used to give another employee the same recurring schedule.

```typescript
export async function copyAssignment(
  assignmentId: string,
  newEmployeeId: string,
  copyDate?: string,
  isSeriesCopy?: boolean
): Promise<{ success: boolean; message: string }>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `assignmentId` | `string` | Source assignment |
| `newEmployeeId` | `string` | Target employee |
| `copyDate` | `string` | New start date (optional) |
| `isSeriesCopy` | `boolean` | Copy entire series vs single occurrence |

**Errors:** `"Mitarbeiter ist bereits diesem Auftrag zugewiesen."` if the employee already has an assignment for this order.

---

### `updateShift`

Updates time, hours, and status for a single shift or an entire recurring series.

```typescript
export async function updateShift(
  assignmentId: string,
  shiftDate: string,
  updates: {
    start_time?: string;
    end_time?: string;
    estimated_hours?: number;
    travel_time_minutes?: number;
    break_time_minutes?: number;
    status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
    update_mode?: "single" | "series";
  }
): Promise<{ success: boolean; message: string }>
```

---

### `simpleReassignShift`

Lightweight reassignment for drag-and-drop in the planning calendar.

```typescript
export async function simpleReassignShift(params: {
  shiftId: string;
  newEmployeeId?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}): Promise<{ success: boolean; message: string }>
```

---

### `addEmployeeToShift`

Adds an additional employee to a shift (supports team shifts).

```typescript
export async function addEmployeeToShift(params: {
  shiftId: string;
  employeeId: string;
  role?: "worker" | "team_lead" | "substitute";
}): Promise<{ success: boolean; message: string }>
```

---

### `removeEmployeeFromShift`

Removes an employee from a shift. If the last employee is removed, deletes the shift.

```typescript
export async function removeEmployeeFromShift(params: {
  shiftId: string;
  employeeId: string;
}): Promise<{ success: boolean; message: string }>
```

---

### `createShift`

Creates a new shift directly (not from an assignment). Used by the drag-and-drop planning interface.

```typescript
export async function createShift(params: {
  assignmentId: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  employeeId?: string;
  travelMinutes?: number;
  breakMinutes?: number;
}): Promise<{ success: boolean; message: string; shiftId?: string }>
```

---

### `createShiftWithSchedule`

Creates a shift and generates a recurring schedule for the employee.

```typescript
export async function createShiftWithSchedule(params: {
  orderId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  schedules: any[];
  recurrenceInterval?: number;
  startWeekOffset?: number;
  travelMinutes?: number;
  breakMinutes?: number;
}): Promise<{ success: boolean; message: string }>
```

---

### `generateShiftsFromAssignments`

Batch-generates shift records from all active `order_employee_assignments` that don't yet have shifts. Called by cron job.

```typescript
export async function generateShiftsFromAssignments(): Promise<{
  success: boolean;
  message: string;
  created_count?: number;
}>
```

---

### `getEmployeesWithExperience`

Returns employees with experience for a given service.

```typescript
export async function getEmployeesWithExperience(
  serviceId: string,
  minLevel?: "beginner" | "intermediate" | "expert"
): Promise<{
  success: boolean;
  data: {
    employee_id: string;
    employee_name: string;
    experience_level: string;
    total_shifts: number;
  }[];
}>
```

---

## 2. Planning (`dashboard/planning/actions.ts`)

---

### `checkAndCompleteOverdueShifts`

Cron job: marks past-due shifts as `completed`.

```typescript
export async function checkAndCompleteOverdueShifts(): Promise<{
  success: boolean;
  completed: number;
  errors: number;
}>
```

---

### `getPlanningDataForRange`

Fetches all data needed to render the planning page for a date range.

```typescript
export async function getPlanningDataForRange(
  startDate: Date,
  endDate: Date,
  filters: { query?: string }
): Promise<{
  success: boolean;
  data: PlanningPageData | null;
  message: string;
}>
```

---

### `assignOrderToEmployee`

Assigns an unassigned order to an employee (creates `order_employee_assignment`).

```typescript
export async function assignOrderToEmployee(
  orderId: string,
  employeeId: string,
  data: AssignmentFormData
): Promise<{ success: boolean; message: string; assignmentId?: string }>
```

---

### `reassignSingleOrder`

Reassigns a single employee's assignment for an order.

```typescript
export async function reassignSingleOrder(
  assignmentId: string,
  newEmployeeId: string,
  updateData: Partial<AssignmentFormData>
): Promise<{ success: boolean; message: string }>
```

---

### `updateOrderAssignments`

Batch-updates multiple employee assignments for an order.

```typescript
export async function updateOrderAssignments(
  orderId: string,
  assignments: AssignmentFormData[]
): Promise<{ success: boolean; message: string }>
```

---

### `reassignSeriesAssignment`

Reassigns an entire recurring series to a different employee.

```typescript
export async function reassignSeriesAssignment(
  assignmentId: string,
  newEmployeeId: string,
  mode: "single" | "future" | "all"
): Promise<{ success: boolean; message: string }>
```

---

## 3. Time Tracking (`dashboard/time-tracking/actions.ts`)

---

### `generateShiftsFromAssignments`

Batch-creates shift records from assignments for a date range.

```typescript
export async function generateShiftsFromAssignments(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; message: string; created_count?: number }>
```

---

### `generateTimeEntriesForShift`

Creates a `time_entry` record from a completed shift. Called automatically when a shift is marked `completed`.

```typescript
export async function generateTimeEntriesForShift(
  shiftId: string
): Promise<{ success: boolean; message: string; created: number }>
```

---

### `createTimeEntry`

Manually creates a time entry.

```typescript
export async function createTimeEntry(
  data: TimeEntryFormValues
): Promise<{ success: boolean; message: string; newEntryId?: string }>
```

---

### `updateTimeEntry`

Updates an existing time entry.

```typescript
export async function updateTimeEntry(
  entryId: string,
  data: Partial<TimeEntryFormValues>
): Promise<{ success: boolean; message: string }>
```

---

### `deleteTimeEntry`

Deletes a single time entry.

```typescript
export async function deleteTimeEntry(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

### `stopTimeEntry`

Stops a running time entry (sets `end_time` to now).

```typescript
export async function stopTimeEntry(
  entryId: string
): Promise<{ success: boolean; message: string; data?: TimeEntry }>
```

---

## 4. Orders (`dashboard/orders/actions.ts`)

---

### `createOrder`

Creates a new order with optional employee assignments and schedules.

```typescript
export async function createOrder(data: OrderFormValues): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
}>
```

---

### `updateOrder`

Updates an existing order and its assignments.

```typescript
export async function updateOrder(
  orderId: string,
  data: OrderFormValues
): Promise<{ success: boolean; message: string }>
```

---

### `deleteOrder`

Soft-deletes an order (marks as `cancelled`).

```typescript
export async function deleteOrder(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

### `processOrderRequest`

Processes a customer order request (approves/rejects).

```typescript
export async function processOrderRequest(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

## 5. Employees (`dashboard/employees/actions.ts`)

---

### `createEmployee`

Creates an employee profile and optionally a linked user account.

```typescript
export async function createEmployee(data: EmployeeFormValues): Promise<{
  success: boolean;
  message: string;
  employeeId?: string;
}>
```

---

### `updateEmployee`

Updates an existing employee profile.

```typescript
export async function updateEmployee(
  employeeId: string,
  data: EmployeeFormValues
): Promise<{ success: boolean; message: string }>
```

---

### `deleteEmployee`

Deletes an employee and anonymizes their personal data.

```typescript
export async function deleteEmployee(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

## 6. Customers (`dashboard/customers/actions.ts`)

---

### `createCustomer`

```typescript
export async function createCustomer(data: CustomerFormValues): Promise<{
  success: boolean;
  message: string;
  customerId?: string;
}>
```

---

### `updateCustomer`

```typescript
export async function updateCustomer(
  customerId: string,
  data: CustomerFormValues
): Promise<{ success: boolean; message: string }>
```

---

### `deleteCustomer`

```typescript
export async function deleteCustomer(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

## 7. Objects (`dashboard/objects/actions.ts`)

Objects are cleaning locations belonging to customers.

---

### `createObject`

```typescript
export async function createObject(data: ObjectFormValues): Promise<{
  success: boolean;
  message: string;
  objectId?: string;
}>
```

---

### `updateObject`

```typescript
export async function updateObject(
  objectId: string,
  data: ObjectFormValues
): Promise<{ success: boolean; message: string }>
```

---

### `deleteObject`

```typescript
export async function deleteObject(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

## 8. Users (`dashboard/users/actions.ts`)

---

### `registerUser`

Creates a new user account and optionally an employee profile.

```typescript
export async function registerUser(data: UserFormValues): Promise<{
  success: boolean;
  message: string;
  userId?: string;
}>
```

---

### `updateUser`

Updates a user's profile or role.

```typescript
export async function updateUser(
  userId: string,
  data: Partial<UserFormValues>
): Promise<{ success: boolean; message: string }>
```

---

### `deleteUser`

Deletes a user account.

```typescript
export async function deleteUser(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

### `assignCustomersToManager`

Assigns customer access to a manager user.

```typescript
export async function assignCustomersToManager(
  managerId: string,
  customerIds: string[]
): Promise<{ success: boolean; message: string }>
```

---

## 9. Absence Requests (`dashboard/absence-requests/actions.ts`)

---

### `createAbsenceRequest`

```typescript
export async function createAbsenceRequest(
  data: AbsenceRequestFormValues
): Promise<{ success: boolean; message: string }>
```

---

### `updateAbsenceRequest`

```typescript
export async function updateAbsenceRequest(
  requestId: string,
  data: Partial<AbsenceRequestFormValues>
): Promise<{ success: boolean; message: string }>
```

---

### `deleteAbsenceRequest`

```typescript
export async function deleteAbsenceRequest(formData: FormData): Promise<{
  success: boolean;
  message: string;
}>
```

---

### `getAbsencesForMonth`

```typescript
export async function getAbsencesForMonth(date: Date): Promise<AbsenceRequest[]>
```

---

### `getVacationBalance`

```typescript
export async function getVacationBalance(employeeId: string): Promise<{
  total_days: number;
  used_days: number;
  remaining_days: number;
}>
```

---

## 10. Notifications (`lib/actions/notifications.ts`)

---

### `sendNotification`

Sends a push notification to a user.

```typescript
export async function sendNotification(params: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}): Promise<boolean>
```

---

### `markAllNotificationsAsRead`

```typescript
export async function markAllNotificationsAsRead(userId: string): Promise<boolean>
```

---

### `markNotificationAsRead`

```typescript
export async function markNotificationAsRead(id: string): Promise<boolean>
```

---

### `deleteNotification`

```typescript
export async function deleteNotification(id: string): Promise<boolean>
```

---

## 11. Finances (`lib/actions/finances.ts`)

---

### `getMultiMonthFinancialData`

```typescript
export async function getMultiMonthFinancialData(
  numberOfMonths?: number
): Promise<{
  success: boolean;
  data: FinancialMonth[];
}>
```

---

### `getRevenueLast7Days`

```typescript
export async function getRevenueLast7Days(): Promise<{
  success: boolean;
  data: DailyRevenue[];
}>
```

---

### `getMostBookedServices`

```typescript
export async function getMostBookedServices(
  limit?: number
): Promise<{
  success: boolean;
  data: { service_title: string; count: number }[];
}>
```

---

## 12. Impersonation (`lib/actions/impersonation.ts`)

Admin-only. Allows managers to impersonate employees for support.

---

### `startImpersonation`

```typescript
export async function startImpersonation(
  targetUserId: string
): Promise<ActionResponse<ImpersonationSessionPayload>>
```

---

### `stopImpersonation`

```typescript
export async function stopImpersonation(
  impersonationSessionId: string
): Promise<ActionResponse<RevertSessionPayload>>
```

---

### `listImpersonationTargets`

```typescript
export async function listImpersonationTargets(): Promise<
  ActionResponse<ImpersonationTarget[]>
>
```

---

## Shared Types

These types are used across multiple actions. They live in `src/lib/actions/shift-planning.ts` and the respective domain action files.

```typescript
// Planning
interface PlanningFilters {
  query?: string;
  employeeGroups?: string[];
  objects?: string[];
  services?: string[];
  experienceLevel?: string;
  showAvailableOnly?: boolean;
  shiftStatus?: string;
}

// Order assignments
interface AssignmentFormData {
  employee_id: string;
  start_date: string;
  end_date: string;
  assigned_daily_schedules: WeekScheduleInput[];
  assigned_recurrence_interval_weeks?: number;
  assigned_start_week_offset?: number;
}

// Time entries
interface TimeEntryFormValues {
  employee_id: string;
  shift_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  hours: number;
  break_minutes?: number;
  notes?: string;
}

// Schedule structure
type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

interface DailyScheduleInput {
  hours: number | null;
  start: string | null;
  end: string | null;
}

interface WeekScheduleInput {
  [key: DayName]: DailyScheduleInput;
}
```
