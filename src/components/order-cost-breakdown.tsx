"use client";

interface OrderCostBreakdownProps {
  totalEstimatedHours: number;
  hourlyRate: number;
  orderType: string;
  recurrenceIntervalWeeks?: number;
  assignedEmployees?: Array<{
    assigned_daily_schedules: any[];
  }>;
  markupPercentage?: number | null;
  customHourlyRate?: number | null;
  totalCost?: number | null;
  showEmployeeBreakdown?: boolean;
  employees?: Array<{
    first_name: string;
    last_name: string;
    hours_per_week: number;
  }>;
}

// Helper function to calculate how many days per week have work scheduled
function calculateWorkDaysPerWeek(assignedEmployees: Array<{ assigned_daily_schedules: any[] }> | undefined): number {
  if (!assignedEmployees || assignedEmployees.length === 0) {
    return 0;
  }

  const daysWithWork = new Set<string>();
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  assignedEmployees.forEach((assignment) => {
    if (assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0) {
      const firstWeekSchedule = assignment.assigned_daily_schedules[0];
      if (firstWeekSchedule) {
        dayNames.forEach(day => {
          const dayHours = firstWeekSchedule[day]?.hours;
          if (typeof dayHours === 'number' && dayHours > 0) {
            daysWithWork.add(day);
          }
        });
      }
    }
  });

  return daysWithWork.size;
}

export function OrderCostBreakdown({
  totalEstimatedHours,
  hourlyRate,
  orderType,
  recurrenceIntervalWeeks = 1,
  assignedEmployees,
  markupPercentage,
  customHourlyRate,
  totalCost,
  showEmployeeBreakdown = false,
  employees = [],
}: OrderCostBreakdownProps) {
  const workDaysPerWeek = calculateWorkDaysPerWeek(assignedEmployees);
  const isPerDeployment = workDaysPerWeek === 1;
  const isRecurring = ['recurring'].includes(orderType);

  // Base cost per deployment/week
  const baseCost = totalCost || (totalEstimatedHours * hourlyRate);

  // Calculate monthly cost for recurring orders
  const monthlyCost = isRecurring
    ? baseCost * (4.33 / recurrenceIntervalWeeks)
    : null;

  // Get description labels
  const deploymentLabel = isRecurring
    ? isPerDeployment
      ? "pro Einsatz"
      : "pro Woche"
    : "pro Auftrag";

  const deploymentLabelShort = isRecurring
    ? isPerDeployment
      ? "Einsatz"
      : "Woche"
    : "Auftrag";

  return (
    <div className="space-y-3">
      {/* Main Cost Display */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Zeitaufwand & Kosten</span>
        </div>

        <p className="text-lg font-semibold mb-1">
          {totalEstimatedHours.toFixed(2)} Std. × {hourlyRate.toFixed(2)} €/h
        </p>

        <p className="text-xl font-bold text-primary mb-2">
          = {baseCost.toFixed(2)} € {deploymentLabel}
        </p>

        {markupPercentage && markupPercentage > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            inkl. {markupPercentage}% Aufschlag
          </p>
        )}

        {customHourlyRate && customHourlyRate > 0 && markupPercentage === null && (
          <p className="text-xs text-muted-foreground">
            individueller Stundensatz
          </p>
        )}
      </div>

      {/* Monthly Breakdown for Recurring Orders */}
      {isRecurring && monthlyCost && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monatliche Hochrechnung</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-green-600">
              {monthlyCost.toFixed(2)} €
            </span>
            <span className="text-xs text-muted-foreground">pro Monat</span>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            { (4.33 / recurrenceIntervalWeeks).toFixed(2) }x pro Monat
            {recurrenceIntervalWeeks > 1 && ` (alle ${recurrenceIntervalWeeks} Wochen)`}
          </p>

          <p className="text-xs text-muted-foreground">
            {totalEstimatedHours.toFixed(2)}h × {hourlyRate.toFixed(2)} €/h × {(4.33 / recurrenceIntervalWeeks).toFixed(2)}x
          </p>
        </div>
      )}

      {/* Non-recurring monthly equivalent (for comparison) */}
      {!isRecurring && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Vergleich: Monatliche Hochrechnung</span>
          </div>

          <p className="text-lg font-semibold text-gray-700">
            {(baseCost * 4.33).toFixed(2)} €
          </p>
          <p className="text-xs text-muted-foreground">
            4.33x pro Monat (theoretische Hochrechnung für einmalige Aufträge)
          </p>
        </div>
      )}
    </div>
  );
}
