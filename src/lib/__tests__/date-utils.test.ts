import { describe, it, expect } from 'vitest';
import {
  isGermanHoliday,
  getDateStyling,
  getHolidayTooltip
} from '../date-utils';

describe('date-utils', () => {
  describe('isGermanHoliday', () => {
    it('should return true for New Year (Neujahr)', () => {
      const newYear = new Date(2024, 0, 1); // 1. January 2024
      const result = isGermanHoliday(newYear);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Neujahr');
    });

    it('should return true for Labour Day (Tag der Arbeit)', () => {
      const labourDay = new Date(2024, 4, 1); // 1. May 2024
      const result = isGermanHoliday(labourDay);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Tag der Arbeit');
    });

    it('should return true for German Unity Day (Tag der Deutschen Einheit)', () => {
      const germanUnityDay = new Date(2024, 9, 3); // 3. October 2024
      const result = isGermanHoliday(germanUnityDay);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Tag der Deutschen Einheit');
    });

    it('should return true for Christmas Day', () => {
      const christmas = new Date(2024, 11, 25); // 25. December 2024
      const result = isGermanHoliday(christmas);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('1. Weihnachtstag');
    });

    it('should return false for a regular weekday', () => {
      const regularDay = new Date(2024, 3, 15); // 15. April 2024 (Monday)
      const result = isGermanHoliday(regularDay);
      expect(result.isHoliday).toBe(false);
      expect(result.name).toBeUndefined();
    });

    it('should calculate Easter Monday correctly for 2024', () => {
      // Easter Monday 2024 is April 1 (not a holiday in all states, but we test our holiday function)
      const easterMonday2024 = new Date(2024, 3, 1); // April 1
      const result = isGermanHoliday(easterMonday2024);
      expect(result.isHoliday).toBe(true);
    });

    it('should return true for Good Friday (Karfreitag)', () => {
      // Good Friday 2024 is March 29
      const goodFriday = new Date(2024, 2, 29);
      const result = isGermanHoliday(goodFriday);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Karfreitag');
    });

    it('should return true for Easter Monday', () => {
      // Easter Monday 2024 is April 1
      const easterMonday = new Date(2024, 3, 1);
      const result = isGermanHoliday(easterMonday);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Ostermontag');
    });

    it('should return true for Ascension Day (Christi Himmelfahrt)', () => {
      // Ascension Day 2024 is May 9
      const ascension = new Date(2024, 4, 9);
      const result = isGermanHoliday(ascension);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Christi Himmelfahrt');
    });

    it('should return true for Whit Monday (Pfingstmontag)', () => {
      // Whit Monday 2024 is May 20
      const whitMonday = new Date(2024, 4, 20);
      const result = isGermanHoliday(whitMonday);
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe('Pfingstmontag');
    });
  });

  describe('getDateStyling', () => {
    it('should return holiday styling for a holiday', () => {
      const christmas = new Date(2024, 11, 25);
      const result = getDateStyling(christmas);
      expect(result.isHoliday).toBe(true);
      expect(result.className).toContain('bg-red-50');
    });

    it('should return weekend styling for Saturday', () => {
      const saturday = new Date(2024, 3, 13); // Saturday April 13, 2024
      const result = getDateStyling(saturday);
      expect(result.isWeekend).toBe(true);
      expect(result.className).toContain('bg-blue-50');
    });

    it('should return weekend styling for Sunday', () => {
      const sunday = new Date(2024, 3, 14); // Sunday April 14, 2024
      const result = getDateStyling(sunday);
      expect(result.isWeekend).toBe(true);
      expect(result.className).toContain('bg-blue-50');
    });

    it('should return empty className for regular weekday', () => {
      const monday = new Date(2024, 3, 15); // Monday April 15, 2024
      const result = getDateStyling(monday);
      expect(result.isWeekend).toBe(false);
      expect(result.isHoliday).toBe(false);
      expect(result.className).toBe('');
    });

    it('should include holiday name when applicable', () => {
      const newYear = new Date(2024, 0, 1);
      const result = getDateStyling(newYear);
      expect(result.holidayName).toBe('Neujahr');
    });
  });

  describe('getHolidayTooltip', () => {
    it('should return holiday name as tooltip for holiday', () => {
      const newYear = new Date(2024, 0, 1);
      const result = getHolidayTooltip(newYear);
      expect(result).toBe('Neujahr');
    });

    it('should return undefined for non-holiday', () => {
      const regularDay = new Date(2024, 3, 15);
      const result = getHolidayTooltip(regularDay);
      expect(result).toBeUndefined();
    });
  });
});
