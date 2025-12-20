"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
// import { getPlanningJobs } from "./jobs"; // TODO: Implement jobs module
import { startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO, getDay, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';

export interface EnhancedPlanningData {
  [employeeId: string]: {
    name: string;
    totalHoursAvailable: number;
    totalHoursPlanned: number;
    raw: any;
    schedule: {
      [date: string]: { // YYYY-MM-DD
        isAvailable: boolean;
        totalHours: number;
        availableHours: number;
        isAbsence: boolean;
        absenceType: string | null;
        jobs: {
          id: string;
          orderId: string;
          title: string;
          startTime: string | null;
          endTime: string | null;
          hours: number;
          status: 'planned' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'replaced';
          service_type: string | null;
          service_color: string | null;
          substitution_type: string | null;
          substitution_label: string | null;
          isPartialSubstitution: boolean;
          notes: string | null;
        }[];
      };
    };
  };
}

export interface EnhancedUnassignedOrder {
  id: string;
  title: string;
  total_estimated_hours: number | null;
  service_type: string | null;
  end_date: string | null;
}

export interface EnhancedPlanningPageData {
  planningData: EnhancedPlanningData;
  unassignedOrders: EnhancedUnassignedOrder[];
  weekNumber: number;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Enhanced planning data retrieval using the new job model
 */
export async function getEnhancedPlanningDataForRange(
  startDate: Date, 
  endDate: Date, 
  filters: { query?: string } = {}
): Promise<{ success: boolean; data: EnhancedPlanningPageData | null; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get jobs using the new RPC function
    // const jobsResult = await getPlanningJobs(startDate, endDate, {
    //   statusFilter: ['planned', 'confirmed', 'active', 'completed', 'cancelled', 'replaced']
    // });

    // if (!jobsResult.success) {
    //   return { success: false, data: null, message: jobsResult.message || "Fehler beim Abrufen der Planungsdaten." };
    // }

    // const jobs = jobsResult.data;
    const jobs: any[] = []; // TODO: Get jobs from getPlanningJobs when implemented

    // Fetch employees with search filter
    let employeesQuery = supabase
      .from('employees')
      .select('*, user_id')
      .eq('status', 'active');

    if (filters.query) {
      employeesQuery = employeesQuery.or(`first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%`);
    }

    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    // Get user profiles for avatars
    const userIds = employees.map(e => e.user_id).filter((id): id is string => id !== null);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p.avatar_url]) || []);
    const employeesWithAvatars = employees.map(employee => ({
      ...employee,
      avatar_url: employee.user_id ? profilesMap.get(employee.user_id) : null,
    }));

    // Fetch approved absences in the period
    const start_date_iso = formatISO(startDate, { representation: 'date' });
    const end_date_iso = formatISO(endDate, { representation: 'date' });

    const { data: absences } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', end_date_iso)
      .gte('end_date', start_date_iso);

    // Process data into enhanced structure
    const planningData: EnhancedPlanningData = {};
    const weekNumber = getWeek(startDate, { weekStartsOn: 1, locale: de });
    const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Create a map of jobs by employee and date for efficient lookup
    const jobMap = new Map<string, any[]>();
    for (const job of jobs) {
      const dateKey = formatISO(parseISO(job.start_at), { representation: 'date' });
      const employeeKey = `${job.employee_id}_${dateKey}`;
      if (!jobMap.has(employeeKey)) {
        jobMap.set(employeeKey, []);
      }
      jobMap.get(employeeKey)!.push(job);
    }

    for (const employee of employeesWithAvatars) {
      let totalHoursAvailable = 0;
      let totalHoursPlanned = 0;
      const employeeSchedule: EnhancedPlanningData[string]['schedule'] = {};

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: 'date' });
        const dayOfWeek = getDay(day);
        const dayKey = dayNames[dayOfWeek];

        employeeSchedule[dateString] = {
          isAvailable: false,
          totalHours: 0,
          availableHours: 0,
          isAbsence: false,
          absenceType: null,
          jobs: [],
        };

        // Check for absence
        const absence = absences?.find(a =>
          a.employee_id === employee.id &&
          parseISO(a.start_date) <= day &&
          parseISO(a.end_date) >= day
        );

        if (absence) {
          employeeSchedule[dateString].isAbsence = true;
          employeeSchedule[dateString].absenceType = absence.type;
          continue;
        }

        // Calculate availability from default schedule
        const defaultRecurrenceInterval = employee.default_recurrence_interval_weeks || 1;
        const defaultStartOffset = employee.default_start_week_offset || 0;
        const daysPassedDefault = differenceInDays(day, startOfWeek(new Date(), { weekStartsOn: 1 }));
        const weeksPassedDefault = Math.floor(daysPassedDefault / 7);
        const effectiveWeekIndexDefault = (weeksPassedDefault + defaultStartOffset) % defaultRecurrenceInterval;

        const defaultWeekSchedule = employee.default_daily_schedules?.[effectiveWeekIndexDefault];
        const defaultDaySchedule = (defaultWeekSchedule as any)?.[dayKey];
        const defaultHours = Number(defaultDaySchedule?.hours ?? 0);

        employeeSchedule[dateString].availableHours = defaultHours;

        if (defaultHours > 0) {
          employeeSchedule[dateString].isAvailable = true;
          totalHoursAvailable += defaultHours;
        }

        // Get jobs for this employee and date
        const employeeKey = `${employee.id}_${dateString}`;
        const dayJobs = jobMap.get(employeeKey) || [];

        for (const job of dayJobs) {
          const startTime = formatISO(parseISO(job.start_at), { representation: 'time' });
          const endTime = formatISO(parseISO(job.end_at), { representation: 'time' });
          const durationHours = (new Date(job.end_at).getTime() - new Date(job.start_at).getTime()) / (1000 * 60 * 60);

          employeeSchedule[dateString].totalHours += durationHours;
          totalHoursPlanned += durationHours;

          employeeSchedule[dateString].jobs.push({
            id: job.occurrence_id,
            orderId: job.order_id,
            title: job.order_title,
            startTime,
            endTime,
            hours: durationHours,
            status: job.status,
            service_type: job.service_type,
            service_color: job.service_color,
            substitution_type: job.substitution_type,
            substitution_label: job.substitution_label,
            isPartialSubstitution: job.is_partial_substitution || false,
            notes: job.notes,
          });
        }
      }

      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        totalHoursAvailable,
        totalHoursPlanned,
        raw: employee,
        schedule: employeeSchedule,
      };
    }

    // Get unassigned orders (using existing logic for now)
    const { data: unassignedOrdersData } = await supabase.rpc('get_unassigned_orders');

    const pageData: EnhancedPlanningPageData = {
      planningData,
      unassignedOrders: unassignedOrdersData || [],
      weekNumber,
    };

    return { success: true, data: pageData, message: "Erweiterte Plandaten erfolgreich geladen." };

  } catch (error: any) {
    console.error("Fehler beim Laden der erweiterten Plandaten:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

/**
 * Helper function to calculate difference in days (since it's not available in date-fns v3)
 */
function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const timeDifference = dateLeft.getTime() - dateRight.getTime();
  return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
}

/**
 * Create a quick job for drag-and-drop functionality
 */
export async function createQuickJob(
  orderId: string,
  employeeId: string,
  dateString: string,
  startTime?: string,
  endTime?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get order and assignment details
    const { data: order } = await supabase
      .from('orders')
      .select('id, title, total_estimated_hours, order_type')
      .eq('id', orderId)
      .single();

    const { data: assignment } = await supabase
      .from('order_employee_assignments')
      .select('id')
      .eq('order_id', orderId)
      .eq('employee_id', employeeId)
      .single();

    if (!order || !assignment) {
      return { success: false, message: "Auftrag oder Zuweisung nicht gefunden." };
    }

    // Calculate start and end times
    const date = parseISO(dateString);
    const estimatedHours = order.total_estimated_hours || 8;
    const startAt = startTime ? 
      `${dateString}T${startTime}:00.000Z` : 
      `${dateString}T09:00:00.000Z`;
    const endAt = endTime ? 
      `${dateString}T${endTime}:00.000Z` : 
      `${dateString}T${String(9 + Math.floor(estimatedHours)).padStart(2, '0')}:00:00.000Z`;

    // Create the job using the existing function
    // const { createJob } = await import('./jobs'); // TODO: Implement jobs module
    // const result = await createJob({
    //   orderId,
    //   assignmentId: assignment.id,
    //   employeeId,
    //   startAt,
    //   endAt,
    //   status: 'planned'
    // });

    // return result;
    return { success: false, message: "createQuickJob not implemented - jobs module missing" };
  } catch (error: any) {
    console.error("Error creating quick job:", error);
    return { success: false, message: error.message || "Fehler beim Erstellen des Einsatzes." };
  }
}