// Time Account (Zeitkonto) configuration
// Defines constants and thresholds for overtime tracking and management

/**
 * Time account configuration for overtime tracking
 *
 * Business Rules:
 * - 160h/month = standard threshold for full-time employees
 * - Hours worked above 160h are credited to time account (NOT a hard limit)
 * - Negative balance is allowed (minus hours must be compensated later)
 * - Max 50h can be carried over to next year (positive balance)
 * - Negative balance resets to 0 at year start
 * - Overtime can be reduced automatically during absences OR manually by admin
 * - Part-time employees get pro-rata calculation based on contract_hours_per_week
 */

export const timeAccountConfig = {
  // Standard working hours for full-time employees
  standardMonthlyHours: 160,
  standardWeeklyHours: 40,

  // Warning thresholds for UI indicators
  warningThresholdPositive: 50,  // Warn if positive balance exceeds 50h
  warningThresholdNegative: -20, // Warn if negative balance goes below -20h

  // Year-end carry-over limits
  maxCarryOverHours: 50,         // Max 50h positive balance can be carried over
  resetNegativeBalance: true,    // Negative balance resets to 0 at year start

  // Feature flags
  allowNegativeBalance: true,     // Allow minus hours to accumulate
  autoConsumeOnAbsence: true,     // Automatically consume overtime during paid absences
  allowManualAdjustment: true,    // Allow admins to manually adjust balances

  // Display formatting
  decimalPlaces: 2,               // Hours displayed with 2 decimal places
} as const;

/**
 * Calculate target monthly hours based on contract
 * @param contractHoursPerWeek - Employee's weekly contract hours
 * @returns Target monthly hours (pro-rated for part-time)
 */
export function calculateTargetHours(contractHoursPerWeek: number | null): number {
  const hours = contractHoursPerWeek ?? timeAccountConfig.standardWeeklyHours;
  return (hours / timeAccountConfig.standardWeeklyHours) * timeAccountConfig.standardMonthlyHours;
}

/**
 * Get warning level for time account balance
 * @param balance - Current time account balance
 * @returns 'none' | 'warning' | 'critical'
 */
export function getBalanceWarningLevel(balance: number): 'none' | 'warning' | 'critical' {
  if (balance > timeAccountConfig.warningThresholdPositive) {
    return 'critical'; // Too much overtime accumulated
  }
  if (balance < timeAccountConfig.warningThresholdNegative) {
    return 'critical'; // Too many minus hours
  }
  if (balance > timeAccountConfig.warningThresholdPositive * 0.6) {
    return 'warning'; // Approaching positive limit
  }
  if (balance < timeAccountConfig.warningThresholdNegative * 0.6) {
    return 'warning'; // Approaching negative limit
  }
  return 'none';
}

/**
 * Calculate hours that can be carried over to next year
 * @param balance - Current positive balance at year end
 * @returns Hours to carry over (max 50h per config)
 */
export function calculateCarryOver(balance: number): number {
  if (balance < 0) return 0;
  return Math.min(balance, timeAccountConfig.maxCarryOverHours);
}

/**
 * Format hours for display
 * @param hours - Hours value to format
 * @returns Formatted string (e.g., "12,50h")
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(timeAccountConfig.decimalPlaces).replace('.', ',')}h`;
}

/**
 * Calculate working days in a month (Monday-Friday, excluding holidays)
 * Note: This is a simplified calculation that doesn't account for public holidays
 * @param year - Year to calculate for
 * @param month - Month (1-12)
 * @returns Number of working days in the month
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= lastDay; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();
    // Monday (1) to Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Calculate working days until today in the current month
 * For past/future months, returns all working days in that month
 * @param year - Year to calculate for
 * @param month - Month (1-12)
 * @returns Number of working days until today (or total if not current month)
 */
export function getWorkingDaysUntilToday(year: number, month: number): number {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // If not current month, return all working days
  if (year !== currentYear || month !== currentMonth) {
    return getWorkingDaysInMonth(year, month);
  }

  const currentDay = today.getDate();
  let workingDays = 0;

  for (let day = 1; day <= currentDay; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();
    // Monday (1) to Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Calculate pro-rated target hours based on working days passed
 * This provides a more accurate "day-to-date" comparison for current months
 * @param contractHoursPerWeek - Employee's weekly contract hours
 * @param year - Year to calculate for
 * @param month - Month (1-12)
 * @returns Object with pro-rated and full month targets
 */
export function calculateProRatedTargetHours(
  contractHoursPerWeek: number | null,
  year: number,
  month: number
): {
  targetSoFar: number;
  targetFullMonth: number;
  workingDaysSoFar: number;
  totalWorkingDays: number;
} {
  const weeklyHours = contractHoursPerWeek ?? timeAccountConfig.standardWeeklyHours;
  const totalWorkingDays = getWorkingDaysInMonth(year, month);
  const workingDaysSoFar = getWorkingDaysUntilToday(year, month);

  // Calculate full month target (160h for full-time)
  const targetFullMonth = (weeklyHours / timeAccountConfig.standardWeeklyHours) * timeAccountConfig.standardMonthlyHours;

  // Pro-rate based on working days passed
  const targetSoFar = totalWorkingDays > 0
    ? (workingDaysSoFar / totalWorkingDays) * targetFullMonth
    : 0;

  return {
    targetSoFar: Math.round(targetSoFar * 100) / 100,
    targetFullMonth,
    workingDaysSoFar,
    totalWorkingDays
  };
}

/**
 * Check if a given year/month is the current month
 * @param year - Year to check
 * @param month - Month (1-12) to check
 * @returns True if the given date is in the current month
 */
export function isCurrentMonth(year: number, month: number): boolean {
  const today = new Date();
  return year === today.getFullYear() && month === today.getMonth() + 1;
}

/**
 * Get the previous month/year for a given date
 * @param year - Current year
 * @param month - Current month (1-12)
 * @returns Object with previous year and month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Format month name for display
 * @param month - Month (1-12)
 * @returns German month name
 */
export function getMonthName(month: number): string {
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];
  return monthNames[month - 1];
}

/**
 * Time account transaction types
 */
export const transactionTypes = {
  monthly_calculation: 'monthly_calculation', // Automatic monthly calculation
  manual_adjustment: 'manual_adjustment',     // Admin manual correction
  absence_consumption: 'absence_consumption', // Auto-consumed during absence
  year_carry_over: 'year_carry_over',         // Year-end carry over
  year_reset: 'year_reset',                   // Year-end negative balance reset
} as const;

export type TransactionType = typeof transactionTypes[keyof typeof transactionTypes];

/**
 * Time account status for display
 */
export const timeAccountStatusConfig = {
  positive: {
    label: 'Positiv',
    bg: 'bg-emerald-100 dark:bg-emerald-900/60',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    solidBg: 'bg-emerald-600',
    icon: 'Clock',
  },
  negative: {
    label: 'Negativ',
    bg: 'bg-rose-100 dark:bg-rose-900/60',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-800 dark:text-rose-200',
    solidBg: 'bg-rose-600',
    icon: 'AlertCircle',
  },
  neutral: {
    label: 'Ausgeglichen',
    bg: 'bg-slate-100 dark:bg-slate-900/60',
    border: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-800 dark:text-slate-200',
    solidBg: 'bg-slate-600',
    icon: 'Minus',
  },
} as const;
