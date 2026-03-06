"use client";

import * as React from "react";
import { format, eachDayOfInterval, getDaysInMonth, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isWeekend } from "date-fns";
import { de } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { getAbsencesForMonth } from "@/app/dashboard/absence-requests/actions";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Plane, Umbrella, GraduationCap, Users, DollarSign, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { absenceTypeConfig, typeTranslations } from "@/lib/absence-type-config";
import { formatEmployeeName } from "@/lib/utils/employee-utils";

interface AbsenceData {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  employees: { id: string; first_name: string | null; last_name: string | null } | null;
}

interface EmployeeAbsenceData {
  [employeeId: string]: {
    name: string;
    absences: { [dateKey: string]: { type: string; start_date: string; end_date: string } };
  };
}

// Map absence types to icon components
const typeIcons: Record<string, React.ElementType> = {
  vacation: Plane,
  sick_leave: Umbrella,
  training: GraduationCap,
  unpaid_leave: DollarSign,
  // Fallback for any unknown types
  other: MoreHorizontal,
};

export function AbsenceTimelineCalendar() {
  const [month, setMonth] = React.useState(new Date());
  const [employeeData, setEmployeeData] = React.useState<EmployeeAbsenceData>({});
  const [employeeWorkingDays, setEmployeeWorkingDays] = React.useState<Record<string, number[]>>({});
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  // German holidays (fixed dates)
  const germanHolidays: Record<string, string> = {
    "01-01": "Neujahr",
    "01-06": "Heilige Drei Könige",
    "04-18": "Karfreitag",
    "04-20": "Ostersonntag",
    "04-21": "Ostermontag",
    "05-01": "Tag der Arbeit",
    "05-29": "Christi Himmelfahrt",
    "06-08": "Pfingstsonntag",
    "06-09": "Pfingstmontag",
    "06-19": "Fronleichnam",
    "08-15": "Mariä Himmelfahrt",
    "10-03": "Tag der Deutschen Einheit",
    "10-31": "Reformationstag",
    "11-01": "Allerheiligen",
    "12-24": "Heiligabend",
    "12-25": "1. Weihnachtstag",
    "12-26": "2. Weihnachtstag",
    "12-31": "Silvester",
  };

  // Get holiday name for a specific date
  const getHolidayName = (date: Date): string | null => {
    const dayKey = format(date, "MM-dd");
    return germanHolidays[dayKey] || null;
  };

  // Check if a day is a working day for the employee
  const isWorkingDay = (date: Date, workingDays: number[]): boolean => {
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    return workingDays.includes(isoDayOfWeek);
  };

  // Get default working days based on number of days per week
  const getDefaultWorkingDays = (daysPerWeek: number): number[] => {
    if (daysPerWeek >= 5) return [1, 2, 3, 4, 5]; // Mon-Fri
    if (daysPerWeek === 4) return [1, 2, 3, 4]; // Mon-Thu
    if (daysPerWeek === 3) return [1, 2, 3]; // Mon-Wed
    if (daysPerWeek === 2) return [1, 4]; // Mon, Thu
    if (daysPerWeek === 1) return [1]; // Monday only
    return [1, 2, 3, 4, 5]; // Default to Mon-Fri
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getAbsencesForMonth(month);
      const processedData: EmployeeAbsenceData = {};
      const workingDaysMap: Record<string, number[]> = {};

      if (result.success && result.data) {
        // First, collect all unique employee IDs from absences
        const employeeIds = new Set<string>();
        result.data.forEach((absence: any) => {
          const empId = absence.employees?.id || absence.employee_id;
          if (empId) {
            employeeIds.add(empId);
          }
        });

        // Fetch working_days_per_week and default_daily_schedules for all employees
        if (employeeIds.size > 0) {
          const { data: employeeData } = await supabase
            .from('employees')
            .select('id, working_days_per_week, default_daily_schedules, first_name, last_name')
            .in('id', Array.from(employeeIds));

          if (employeeData) {
            employeeData.forEach(emp => {
              // Parse default_daily_schedules if it exists
              // Structure: [{ "monday": { "hours": null }, "tuesday": { "hours": "3.5" }, ... }]
              let workingDays: number[] = [1, 2, 3, 4, 5]; // Default Mon-Fri
              if (emp.default_daily_schedules) {
                try {
                  const schedules = typeof emp.default_daily_schedules === 'string'
                    ? JSON.parse(emp.default_daily_schedules)
                    : emp.default_daily_schedules;

                  // The schedules is an array with one object containing all days
                  const daySchedule = Array.isArray(schedules) ? schedules[0] : schedules;

                  // Only process if daySchedule is a valid object
                  if (daySchedule && typeof daySchedule === 'object') {
                    // Map day names to ISO day numbers (1=Mon, 7=Sun)
                    const dayNameToNumber: Record<string, number> = {
                      monday: 1,
                      tuesday: 2,
                      wednesday: 3,
                      thursday: 4,
                      friday: 5,
                      saturday: 6,
                      sunday: 7,
                    };

                    // Find days with non-null hours
                    workingDays = Object.entries(daySchedule)
                    .filter(([dayName, dayData]: [string, any]) => {
                      const hours = dayData?.hours;
                      return hours !== null && hours !== undefined && hours !== '';
                    })
                    .map(([dayName]) => dayNameToNumber[dayName.toLowerCase()] || 0)
                    .filter(day => day >= 1 && day <= 7);
                  }
                } catch (e) {
                  console.error('Error parsing schedules:', e);
                }
              } else if (emp.working_days_per_week) {
                workingDays = getDefaultWorkingDays(emp.working_days_per_week);
              }

              workingDaysMap[emp.id] = workingDays;
            });
          }
        }

        // Now process absences with working days
        result.data.forEach((absence: any) => {
          const employeeId = absence.employees?.id || absence.employee_id;
          if (!employeeId) return;

          const workingDays = workingDaysMap[employeeId] || [1, 2, 3, 4, 5];
          const employeeName = absence.employees
            ? formatEmployeeName(absence.employees)
            : 'Unknown';

          if (!processedData[employeeId]) {
            processedData[employeeId] = {
              name: employeeName,
              absences: {},
            };
          }

          const interval = eachDayOfInterval({
            start: new Date(absence.start_date),
            end: new Date(absence.end_date),
          });

          interval.forEach((day) => {
            const isWorking = isWorkingDay(day, workingDays);
            // Only mark absence on working days
            if (isSameMonth(day, month) && isWorking) {
              const dateKey = format(day, "yyyy-MM-dd");
              processedData[employeeId].absences[dateKey] = {
                type: absence.type,
                start_date: absence.start_date,
                end_date: absence.end_date,
              };
            }
          });
        });
      }

      setEmployeeWorkingDays(workingDaysMap);
      setEmployeeData(processedData);
      setLoading(false);
    };
    fetchData();
  }, [month]);

  const handlePrevMonth = () => setMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setMonth(prev => addMonths(prev, 1));

  // Get all days in the view (including days from prev/next month for complete weeks)
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const daysInView = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const allDaysInMonth = Array.from({ length: getDaysInMonth(month) }, (_, i) => i + 1);

  const employeeIds = Object.keys(employeeData);
  const today = new Date();

  // Helper to get day info
  const getDayInfo = (day: number) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    const dayAbbrev = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dayOfWeek];
    return { isWeekend: isWeekendDay, dayAbbrev };
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy", { locale: de })}</span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: `180px repeat(${allDaysInMonth.length}, minmax(26px, 1fr))` }}>
            <div className="sticky left-0 bg-card z-10 px-2 py-2 text-xs font-semibold border-b">
              Mitarbeiter
            </div>
            {allDaysInMonth.map(day => {
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const { isWeekend, dayAbbrev } = getDayInfo(day);
              const dateKey = format(date, "yyyy-MM-dd");
              const holidayName = getHolidayName(date);

              return (
                <div key={day} className={cn(
                  "text-center py-2 text-xs font-medium border-b",
                  isWeekend && "bg-blue-50 dark:bg-blue-950/30",
                  holidayName && "bg-red-50 dark:bg-red-950/30",
                  isSameDay(date, today) && "bg-primary/20 border-2 border-primary"
                )}>
                  <div className={cn(
                    isWeekend && "text-blue-600 dark:text-blue-400",
                    holidayName && "text-red-600 dark:text-red-400 font-semibold"
                  )}>{dayAbbrev}</div>
                  <div className="text-[9px] text-muted-foreground font-normal">{day}</div>
                  {holidayName && (
                    <div className="text-[8px] text-red-500 dark:text-red-400 truncate px-0.5" title={holidayName}>
                      {holidayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Employee rows */}
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid" style={{ gridTemplateColumns: `180px repeat(${allDaysInMonth.length}, minmax(26px, 1fr))` }}>
                <div className="sticky left-0 bg-card z-10 px-2 py-2 border-b">
                  <Skeleton className="h-4 w-24" />
                </div>
                {allDaysInMonth.map(day => (
                  <div key={day} className="p-1 border-b">
                    <Skeleton className="h-6 w-6 mx-auto rounded" />
                  </div>
                ))}
              </div>
            ))
          ) : employeeIds.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Keine Abwesenheiten für diesen Monat
            </div>
          ) : (
            employeeIds.map(id => (
              <div
                key={id}
                className="grid hover:bg-muted/30 transition-colors"
                style={{ gridTemplateColumns: `180px repeat(${allDaysInMonth.length}, minmax(26px, 1fr))` }}
              >
                {/* Employee name */}
                <div className="sticky left-0 bg-card z-10 px-2 py-2 font-medium text-xs border-b truncate">
                  {employeeData[id].name}
                </div>

                {/* Days */}
                {allDaysInMonth.map(day => {
                  const currentDate = new Date(month.getFullYear(), month.getMonth(), day);
                  const dateKey = format(currentDate, "yyyy-MM-dd");
                  const absenceEntry = employeeData[id].absences[dateKey];
                  const typeKey = absenceEntry?.type || '';
                  const TypeIcon = typeIcons[typeKey] || typeIcons.other;
                  const config = absenceTypeConfig[typeKey] || {
                    ...absenceTypeConfig.vacation,
                    label: typeKey,
                  };
                  const { isWeekend } = getDayInfo(day);
                  const holidayName = getHolidayName(currentDate);

                  return (
                    <div key={day} className={cn(
                      "p-0.5 text-center border-b",
                      isWeekend && "bg-blue-50 dark:bg-blue-950/30",
                      holidayName && "bg-red-50 dark:bg-red-950/30",
                      isSameDay(currentDate, today) && "bg-primary/20"
                    )}>
                      {absenceEntry ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-6 h-6 mx-auto flex items-center justify-center rounded-md border cursor-pointer hover:scale-110 transition-transform",
                                  config.bg,
                                  config.border
                                )}
                              >
                                <TypeIcon className={cn("h-3.5 w-3.5", config.text)} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="z-[100] text-xs">
                              <p className="font-semibold">{typeTranslations[typeKey] || typeKey}</p>
                              <p className="text-muted-foreground">
                                {format(new Date(absenceEntry.start_date), 'dd.MM.')} - {format(new Date(absenceEntry.end_date), 'dd.MM.yyyy')}
                              </p>
                              <p className="font-medium">{employeeData[id].name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/20">
        {Object.entries(absenceTypeConfig).map(([key, config]) => {
          const Icon = typeIcons[key];
          if (!Icon) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn(
                "w-5 h-5 rounded flex items-center justify-center border",
                config.bg,
                config.border
              )}>
                <Icon className={cn("h-3 w-3", config.text)} />
              </div>
              <span className="text-xs text-foreground">{typeTranslations[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
