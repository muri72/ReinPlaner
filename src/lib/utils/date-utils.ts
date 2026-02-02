/**
 * Centralized date utilities for absence and vacation calculations.
 */

/**
 * Get default working days based on number of days per week.
 * Assumes Monday-Friday for 5 days, fills in starting from Monday.
 * @param daysPerWeek - Number of working days per week (1-5)
 * @returns Array of weekdays (1=Mon, 2=Tue, etc.)
 */
export function getDefaultWorkingDays(daysPerWeek: number): number[] {
  if (daysPerWeek >= 5) return [1, 2, 3, 4, 5]; // Mon-Fri
  if (daysPerWeek === 4) return [1, 2, 3, 4]; // Mon-Thu
  if (daysPerWeek === 3) return [1, 2, 3]; // Mon-Wed
  if (daysPerWeek === 2) return [1, 4]; // Mon, Thu (common part-time)
  if (daysPerWeek === 1) return [1]; // Monday only
  return [1, 2, 3, 4, 5]; // Default to Mon-Fri
}

/**
 * Get working days from an employee's default_daily_schedules.
 * @param schedules - Array of daily schedule objects with day_of_week property
 * @returns Array of weekday numbers (1=Mon, 2=Tue, etc.)
 */
export function getWorkingDaysFromSchedules(schedules: { day_of_week: number }[] | null | undefined): number[] {
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return [1, 2, 3, 4, 5]; // Default to Mon-Fri
  }
  return schedules.map(s => s.day_of_week).filter(d => d >= 1 && d <= 7);
}

/**
 * Calculate working days between two dates based on working days per week.
 * @param start - Start date
 * @param end - End date
 * @param workingDaysPerWeek - Array of days that are working days (1=Mon, 2=Tue, etc.) or single number 1-7
 * @returns Number of working days in the range
 */
export function calculateWorkingDays(
  start: Date,
  end: Date,
  workingDaysPerWeek: number | number[]
): number {
  let count = 0;
  const current = new Date(start);

  // Convert to array of working days (1-7, where 1=Monday)
  const workingDays = Array.isArray(workingDaysPerWeek)
    ? workingDaysPerWeek
    : getDefaultWorkingDays(workingDaysPerWeek);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // Convert to 1-based (Mon=1, Sun=7) for comparison
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (workingDays.includes(isoDayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Format working days as a human-readable string.
 * @param workingDays - Array of weekday numbers (1=Mon, 2=Tue, etc.)
 * @returns German day abbreviations (Mo, Di, Mi, etc.)
 */
export function formatWorkingDays(workingDays: number[]): string {
  const dayNames: Record<number, string> = {
    1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So'
  };
  return workingDays
    .sort((a, b) => a - b)
    .map(d => dayNames[d] || '')
    .filter(Boolean)
    .join(', ');
}

/**
 * Get the number of calendar days between two dates.
 * @param start - Start date
 * @param end - End date
 * @returns Number of calendar days (inclusive)
 */
export function getCalendarDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
