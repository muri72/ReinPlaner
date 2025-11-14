import { settingsService } from '@/lib/services/settings-service';

/**
 * Check if a date is a German public holiday
 */
export async function isHoliday(date: Date, bundeslandCode: string): Promise<boolean> {
  const holiday = await settingsService.isHoliday(
    date.toISOString().split('T')[0],
    bundeslandCode
  );
  return holiday !== null;
}

/**
 * Get holiday info for a date
 */
export async function getHolidayInfo(date: Date, bundeslandCode: string) {
  return await settingsService.isHoliday(
    date.toISOString().split('T')[0],
    bundeslandCode
  );
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
 */
export async function getWorkType(date: Date, bundeslandCode: string): Promise<{
  type: 'normal' | 'holiday' | 'weekend';
  label: string;
  color: string;
  holidayName?: string;
}> {
  const holiday = await getHolidayInfo(date, bundeslandCode);

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
 */
export async function addHolidayIndicator(
  dateStr: string,
  bundeslandCode: string
): Promise<{ date: string; isHoliday: boolean; holidayName?: string }> {
  const date = new Date(dateStr);
  const holiday = await getHolidayInfo(date, bundeslandCode);

  return {
    date: dateStr,
    isHoliday: holiday !== null,
    holidayName: holiday?.name,
  };
}
