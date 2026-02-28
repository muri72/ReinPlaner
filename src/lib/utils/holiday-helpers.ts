import { isGermanHoliday as isGermanHolidayDateUtils } from '@/lib/date-utils';

/**
 * Check if a date is a German public holiday
 * @param date The date to check
 * @param bundeslandCode Optional - for nationwide holidays, this parameter is ignored
 */
export function isHoliday(date: Date, bundeslandCode?: string): boolean {
  return isGermanHolidayDateUtils(date).isHoliday;
}

/**
 * Get holiday info for a date
 * @param date The date to check
 * @param bundeslandCode Optional - for nationwide holidays, this parameter is ignored
 */
export function getHolidayInfo(date: Date, bundeslandCode?: string) {
  const result = isGermanHolidayDateUtils(date);
  return result.isHoliday ? { name: result.name, date: date.toISOString().split('T')[0] } : null;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get work type for a date (Normal, Holiday, Weekend)
 * @param date The date to check
 * @param bundeslandCode Optional - for nationwide holidays, this parameter is ignored
 */
export function getWorkType(date: Date, bundeslandCode?: string): {
  type: 'normal' | 'holiday' | 'weekend';
  label: string;
  color: string;
  holidayName?: string;
} {
  const holiday = getHolidayInfo(date, bundeslandCode);

  if (holiday) {
    return {
      type: 'holiday',
      label: 'Feiertag',
      color: '#dc2626', // red-600
      holidayName: holiday.name,
    };
  }

  if (isWeekend(date)) {
    return {
      type: 'weekend',
      label: 'Wochenende',
      color: '#7c3aed', // violet-600
    };
  }

  return {
    type: 'normal',
    label: 'Normal',
    color: '#16a34a', // green-600
  };
}

/**
 * Add holiday indicator to a date string
 * @param dateStr The date string to check
 * @param bundeslandCode Optional - for nationwide holidays, this parameter is ignored
 */
export function addHolidayIndicator(
  dateStr: string,
  bundeslandCode?: string
): { date: string; isHoliday: boolean; holidayName?: string } {
  const date = new Date(dateStr);
  const holiday = getHolidayInfo(date, bundeslandCode);

  return {
    date: dateStr,
    isHoliday: holiday !== null,
    holidayName: holiday?.name,
  };
}
