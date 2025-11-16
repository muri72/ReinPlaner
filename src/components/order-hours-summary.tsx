"use client";

import { Clock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmployeeHours {
  first_name: string;
  last_name: string;
  hours_per_week: number;
}

interface OrderHoursSummaryProps {
  totalHours: number | null;
  employees: EmployeeHours[];
  orderType: string;
  recurrenceIntervalWeeks?: number;
  className?: string;
  // Optionally pass assignedEmployees to calculate hours
  assignedEmployees?: Array<{
    employeeId: string;
    assigned_daily_schedules: any[];
  }>;
}

export function OrderHoursSummary({
  totalHours,
  employees,
  orderType,
  recurrenceIntervalWeeks = 1,
  className = "",
  assignedEmployees,
}: OrderHoursSummaryProps) {
  // Don't render if no hours data
  if (!totalHours || totalHours === 0) {
    return null;
  }

  const isRecurring = ['recurring', 'substitution', 'permanent'].includes(orderType);

  const intervalText = isRecurring
    ? recurrenceIntervalWeeks === 1
      ? "jede Woche"
      : recurrenceIntervalWeeks === 2
      ? "alle 2 Wochen"
      : `alle ${recurrenceIntervalWeeks} Wochen`
    : "einmalig";

  // Calculate hours per employee from assigned_daily_schedules if provided
  const calculateEmployeeHours = (): EmployeeHours[] => {
    if (!assignedEmployees || assignedEmployees.length === 0) {
      return employees;
    }

    return assignedEmployees.map((assignment, index) => {
      const employeeName = employees[index] || { first_name: "", last_name: "", hours_per_week: 0 };

      // Calculate total hours for this employee across all weeks
      let totalHours = 0;
      if (assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0) {
        assignment.assigned_daily_schedules.forEach((weekSchedule: any) => {
          if (weekSchedule) {
            // Sum up hours for all days in this week
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
              const dayHours = weekSchedule[day]?.hours;
              if (typeof dayHours === 'number' && dayHours > 0) {
                totalHours += dayHours;
              }
            });
          }
        });
      }

      return {
        first_name: employeeName.first_name,
        last_name: employeeName.last_name,
        hours_per_week: totalHours,
      };
    });
  };

  const employeeHoursList = calculateEmployeeHours();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Total Hours Display */}
      <div className="flex items-center">
        <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">
          {totalHours.toFixed(2)}h
        </span>
        {isRecurring && (
          <Badge variant="outline" className="ml-2 text-xs">
            {intervalText}
          </Badge>
        )}
      </div>


      {/* Employee Hours Breakdown - Only show if more than 1 employee */}
      {employeeHoursList.length > 1 && (
        <div className="ml-6 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Aufgeteilt auf Mitarbeiter:
          </p>
          {employeeHoursList.map((emp, index) => (
            <div key={index} className="flex items-center text-xs text-muted-foreground">
              <UserRound className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="flex-1">
                {emp.first_name} {emp.last_name}
              </span>
              <span className="font-medium text-foreground">
                {emp.hours_per_week.toFixed(2)}h
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
