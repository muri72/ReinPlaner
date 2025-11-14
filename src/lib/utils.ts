import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to calculate hours between two time strings (HH:MM)
export const calculateHours = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date(0, 0, 0, startH, startM);
  let endDate = new Date(0, 0, 0, endH, endM);

  // If end time is earlier than start time, assume it's the next day
  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

// Helper to format duration from minutes to HH:MM
export const formatDuration = (minutes: number | null) => {
  if (minutes === null || isNaN(minutes)) return "N/A"; // Add isNaN check
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${remainingMinutes}m`;
};

// Helper to calculate end time based on start time and duration in hours
export const calculateEndTime = (startTime: string, durationHours: number): string => {
  const [startH, startM] = startTime.split(':').map(Number);
  const totalMinutes = startH * 60 + startM + Math.round(durationHours * 60);

  const endH = Math.floor(totalMinutes / 60) % 24; // Handle overflow past 24 hours
  const endM = totalMinutes % 60;

  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

// NEW: Helper to calculate start time based on end time and duration in hours
export const calculateStartTime = (endTime: string, durationHours: number): string => {
  const [endH, endM] = endTime.split(':').map(Number);
  const totalMinutes = endH * 60 + endM - Math.round(durationHours * 60);

  // Handle negative minutes (e.g., if start time is on previous day)
  let startH = Math.floor(totalMinutes / 60);
  let startM = totalMinutes % 60;

  if (startM < 0) {
    startM += 60;
    startH -= 1;
  }
  if (startH < 0) {
    startH += 24; // Wrap around to previous day
  }

  return `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
};

// Helper to format date with weekday (DD.MM.YYYY -> "Fr 03.10.2025")
export const formatDateWithWeekday = (dateStr: string): string => {
  // dateStr is in format DD.MM.YYYY
  const [day, month, year] = dateStr.split('.');
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(isoDate);

  const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
  return `${weekday} ${day}.${month}.${year}`;
};