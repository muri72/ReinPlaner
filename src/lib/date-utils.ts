import { format, isWeekend, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

// Cache for API responses
const holidayCache = new Map<string, any>();

// Get Hamburg holidays from API with caching
async function getHamburgHolidaysFromAPI(year: number): Promise<any[]> {
  const cacheKey = `${year}-HH`;
  
  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey);
  }

  try {
    const response = await fetch(`https://get.api-feiertage.de?states=hh&jahr=${year}`);
    const data = await response.json();
    
    if (data.status === "success" && data.feiertage) {
      holidayCache.set(cacheKey, data.feiertage);
      return data.feiertage;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Hamburg holidays:', error);
    return [];
  }
}

// German holidays (fixed dates) - fallback for API
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "Neujahr" },
  { month: 5, day: 1, name: "Tag der Arbeit" },
  { month: 10, day: 3, name: "Tag der Deutschen Einheit" },
  { month: 12, day: 25, name: "1. Weihnachtstag" },
  { month: 12, day: 26, name: "2. Weihnachtstag" },
];

// Calculate Easter Sunday (Gauss algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

// Get movable holidays based on Easter
function getMovableHolidays(year: number): Array<{ month: number; day: number; name: string }> {
  const easter = getEasterSunday(year);
  const easterDay = easter.getDate();
  const easterMonth = easter.getMonth() + 1;
  
  return [
    // Karfreitag (Good Friday) - 2 days before Easter
    { 
      month: easterMonth, 
      day: easterDay - 2, 
      name: "Karfreitag" 
    },
    // Ostermontag (Easter Monday) - 1 day after Easter
    { 
      month: easterMonth, 
      day: easterDay + 1, 
      name: "Ostermontag" 
    },
    // Christi Himmelfahrt (Ascension Day) - 39 days after Easter
    { 
      month: easterMonth, 
      day: easterDay + 39, 
      name: "Christi Himmelfahrt" 
    },
    // Pfingstmontag (Whit Monday) - 50 days after Easter
    { 
      month: easterMonth, 
      day: easterDay + 50, 
      name: "Pfingstmontag" 
    },
  ];
}

// Check if a date is a Hamburg holiday
export async function isGermanHoliday(date: Date): Promise<{ isHoliday: boolean; name?: string }> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Try to get Hamburg holidays from API first
  const apiHolidays = await getHamburgHolidaysFromAPI(year);
  
  // Check API holidays - the API uses "date" field, not "datum"
  for (const holiday of apiHolidays) {
    if (holiday.date && holiday.date.startsWith(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)) {
      // Check if this holiday is valid for Hamburg (hh field should be "1")
      if (holiday.hh === "1") {
        return { isHoliday: true, name: holiday.fname };
      }
    }
  }
  
  // Fallback to fixed holidays if API fails
  const fixedHoliday = FIXED_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (fixedHoliday) {
    return { isHoliday: true, name: fixedHoliday.name };
  }
  
  // Check movable holidays
  const movableHolidays = getMovableHolidays(year);
  const movableHoliday = movableHolidays.find(h => h.month === month && h.day === day);
  if (movableHoliday) {
    return { isHoliday: true, name: movableHoliday.name };
  }
  
  return { isHoliday: false };
}

// Get all holidays for a year
export async function getAllHolidaysForYear(year: number): Promise<Array<{ date: Date; name: string }>> {
  const apiHolidays = await getHamburgHolidaysFromAPI(year);
  const holidays: Array<{ date: Date; name: string }> = [];
  
  // Process API holidays
  for (const holiday of apiHolidays) {
    if (holiday.date && holiday.hh === "1") {
      const [year, month, day] = holiday.date.split('-').map(Number);
      holidays.push({
        date: new Date(year, month - 1, day),
        name: holiday.fname
      });
    }
  }
  
  // Add fixed holidays as fallback
  FIXED_HOLIDAYS.forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name
    });
  });
  
  // Add movable holidays
  getMovableHolidays(year).forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name
    });
  });
  
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Get styling classes for a date
export async function getDateStyling(date: Date): Promise<{ 
  isWeekend: boolean; 
  isHoliday: boolean; 
  holidayName?: string;
  className: string;
}> {
  const isWeekendDay = isWeekend(date);
  const holidayInfo = await isGermanHoliday(date);
  
  let className = "";
  
  if (holidayInfo.isHoliday) {
    className = "bg-red-50 border-red-200 text-red-700";
  } else if (isWeekendDay) {
    className = "bg-blue-50 border-blue-200 text-blue-700";
  }
  
  return {
    isWeekend: isWeekendDay,
    isHoliday: holidayInfo.isHoliday,
    holidayName: holidayInfo.name,
    className
  };
}

// Get holiday name for tooltip
export async function getHolidayTooltip(date: Date): Promise<string | undefined> {
  const holidayInfo = await isGermanHoliday(date);
  return holidayInfo.isHoliday ? holidayInfo.name : undefined;
}