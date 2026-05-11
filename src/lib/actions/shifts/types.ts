// ============================================================================
// TYPES
// ============================================================================

export interface ShiftEmployee {
  employee_id: string;
  employee_name: string;
  avatar_url?: string;
  role: "worker" | "team_lead" | "substitute";
  is_confirmed: boolean;
}

export interface ShiftAssignment {
  id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  estimated_hours: number;
  travel_time_minutes: number | null;
  break_time_minutes: number | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  is_detached_from_series: boolean;

  // Job Info
  job_id: string;
  job_title: string;
  priority: string;

  // Object Info
  object_id: string | null;
  object_name: string | null;
  object_address: string | null;

  // Service Info
  service_id: string | null;
  service_title: string | null;
  service_color: string | null;

  // Series Info
  series_id: string | null;
  is_recurring: boolean;

  // Order reference for grouping team members
  order_id: string | null;

  // Employees
  employees: ShiftEmployee[];
  is_team: boolean;
  is_multi_shift: boolean;

  // Assignment reference (for order_employee_assignments)
  assignment_id: string | null;
}

export interface EmployeeShiftData {
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

export interface ShiftPlanningData {
  [employeeId: string]: EmployeeShiftData;
}

export interface UnassignedShift {
  id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  job_title: string;
  object_name: string | null;
  service_title: string | null;
  service_color: string | null;
  estimated_hours: number | null;
  assignment_id?: string;
}

export interface ShiftPlanningPageData {
  planningData: ShiftPlanningData;
  unassignedShifts: UnassignedShift[];
  weekNumber: number;
}

export interface PlanningFilters {
  query?: string;
  employeeGroups?: string[];
  objects?: string[];
  services?: string[];
  experienceLevel?: string;
  showAvailableOnly?: boolean;
  shiftStatus?: string;
}

export const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type ShiftSeriesEditMode = "single" | "future" | "all";
export type SeriesDeleteMode = "single" | "future" | "all";
export type AssignmentEditMode = "single" | "future" | "all";

export interface CreateShiftParams {
  assignmentId: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  estimatedHours?: number;
  travelTimeMinutes?: number;
  breakTimeMinutes?: number;
}

export interface CreateShiftWithScheduleParams {
  assignmentId: string;
  startDate: string;
  endDate: string;
  dailySchedule: {
    [day: string]: {
      enabled: boolean;
      startTime?: string;
      endTime?: string;
      estimatedHours?: number;
    };
  };
  travelTimeMinutes?: number;
  breakTimeMinutes?: number;
}