import { format, isWeekend, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

// German holidays (fixed dates) - Hamburg specific
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "Neujahr" },
  { month: 5, day: 1, name: "Tag der Arbeit" },
  { month: 10, day: 3, name: "Tag der Deutschen Einheit" },
  { month: 12, day: 25, name: "1. Weihnachtstag" },
  { month: 12, day: 26, name: "2. Weihnachtstag" },
];

// Hamburg specific holidays (Reformationstag since 2018)
function getHamburgSpecificHolidays(year: number): Array<{ month: number; day: number; name: string }> {
  const holidays: Array<{ month: number; day: number; name: string }> = [];
  
  // Reformationstag (31. Oktober) - nur in Hamburg seit 2018
  if (year >= 2018) {
    holidays.push({ month: 10, day: 31, name: "Reformationstag" });
  }
  
  return holidays;
}

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
export function isGermanHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Check fixed holidays
  const fixedHoliday = FIXED_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (fixedHoliday) {
    return { isHoliday: true, name: fixedHoliday.name };
  }
  
  // Check Hamburg specific holidays
  const hamburgHolidays = getHamburgSpecificHolidays(year);
  const hamburgHoliday = hamburgHolidays.find(h => h.month === month && h.day === day);
  if (hamburgHoliday) {
    return { isHoliday: true, name: hamburgHoliday.name };
  }
  
  // Check movable holidays
  const movableHolidays = getMovableHolidays(year);
  const movableHoliday = movableHolidays.find(h => h.month === month && h.day === day);
  if (movableHoliday) {
    return { isHoliday: true, name: movableHoliday.name };
  }
  
  return { isHoliday: false };
}

// Get styling classes for a date
export function getDateStyling(date: Date): { 
  isWeekend: boolean; 
  isHoliday: boolean; 
  holidayName?: string;
  className: string;
} {
  const isWeekendDay = isWeekend(date);
  const holidayInfo = isGermanHoliday(date);
  
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
export function getHolidayTooltip(date: Date): string | undefined {
  const holidayInfo = isGermanHoliday(date);
  return holidayInfo.isHoliday ? holidayInfo.name : undefined;
}

// Get all holidays for a year (for debugging/reference)
export function getAllHolidaysForYear(year: number): Array<{ date: Date; name: string }> {
  const holidays: Array<{ date: Date; name: string }> = [];
  
  // Fixed holidays
  FIXED_HOLIDAYS.forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name
    });
  });
  
  // Hamburg specific holidays
  getHamburgSpecificHolidays(year).forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name
    });
  });
  
  // Movable holidays
  getMovableHolidays(year).forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name
    });
  });
  
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}