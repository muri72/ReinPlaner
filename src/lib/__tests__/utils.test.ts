import { describe, it, expect } from 'vitest';
import {
  cn,
  calculateHours,
  formatDuration,
  calculateEndTime,
  calculateStartTime,
  parseLocalDate,
  formatDateToYMD,
  formatDateWithWeekday,
  calculateFinalHourlyRate,
  calculateTotalCost,
} from '../utils';

describe('cn (classname utility)', () => {
  it('should merge classnames correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle mixed inputs', () => {
    expect(cn('foo', ['bar', 'baz'], { qux: true }, false && 'quux')).toBe('foo bar baz qux');
  });
});

describe('calculateHours', () => {
  it('should calculate hours between two times', () => {
    expect(calculateHours('09:00', '17:00')).toBe(8);
  });

  it('should handle null inputs', () => {
    expect(calculateHours(null, '17:00')).toBeNull();
    expect(calculateHours('09:00', null)).toBeNull();
    expect(calculateHours(null, null)).toBeNull();
  });

  it('should handle times crossing midnight', () => {
    expect(calculateHours('22:00', '06:00')).toBe(8);
  });

  it('should handle half hours', () => {
    expect(calculateHours('09:00', '10:30')).toBe(1.5);
  });
});

describe('formatDuration', () => {
  it('should format minutes to hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(60)).toBe('1h 0m');
    expect(formatDuration(45)).toBe('0h 45m');
  });

  it('should handle null input', () => {
    expect(formatDuration(null)).toBe('N/A');
  });

  it('should handle NaN', () => {
    expect(formatDuration(NaN)).toBe('N/A');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0h 0m');
  });
});

describe('calculateEndTime', () => {
  it('should calculate end time from start and duration', () => {
    expect(calculateEndTime('09:00', 8)).toBe('17:00');
    expect(calculateEndTime('09:00', 1.5)).toBe('10:30');
  });

  it('should handle overflow past midnight', () => {
    expect(calculateEndTime('20:00', 5)).toBe('01:00');
  });

  it('should handle exact midnight', () => {
    expect(calculateEndTime('22:00', 2)).toBe('00:00');
  });
});

describe('calculateStartTime', () => {
  it('should calculate start time from end and duration', () => {
    expect(calculateStartTime('17:00', 8)).toBe('09:00');
    expect(calculateStartTime('10:30', 1.5)).toBe('09:00');
  });

  it('should handle underflow before midnight', () => {
    expect(calculateStartTime('02:00', 5)).toBe('21:00');
  });

  it('should handle exact midnight', () => {
    expect(calculateStartTime('00:00', 2)).toBe('22:00');
  });
});

describe('parseLocalDate', () => {
  it('should parse YYYY-MM-DD string to Date', () => {
    const result = parseLocalDate('2024-03-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
    expect(result?.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(result?.getUTCDate()).toBe(15);
  });

  it('should handle null input', () => {
    expect(parseLocalDate(null)).toBeNull();
  });

  it('should handle undefined input', () => {
    expect(parseLocalDate(undefined)).toBeNull();
  });

  it('should handle empty string', () => {
    expect(parseLocalDate('')).toBeNull();
  });
});

describe('formatDateToYMD', () => {
  it('should format Date to YYYY-MM-DD string', () => {
    const date = new Date(Date.UTC(2024, 2, 15)); // March 15, 2024
    expect(formatDateToYMD(date)).toBe('2024-03-15');
  });

  it('should handle null input', () => {
    expect(formatDateToYMD(null)).toBeNull();
  });

  it('should handle undefined input', () => {
    expect(formatDateToYMD(undefined)).toBeNull();
  });

  it('should pad month and day with zeros', () => {
    const date = new Date(Date.UTC(2024, 0, 5)); // January 5, 2024
    expect(formatDateToYMD(date)).toBe('2024-01-05');
  });
});

describe('formatDateWithWeekday', () => {
  it('should format date with weekday in German', () => {
    // March 15, 2024 was a Friday
    const result = formatDateWithWeekday('15.03.2024');
    expect(result).toContain('Fr');
    expect(result).toContain('15.03.2024');
  });

  it('should handle various dates', () => {
    expect(formatDateWithWeekday('01.01.2024')).toContain('Mo'); // Monday
    expect(formatDateWithWeekday('06.04.2024')).toContain('Sa'); // Saturday
  });
});

describe('calculateFinalHourlyRate', () => {
  const mockServices: { key: string; default_hourly_rate: number | null }[] = [
    { key: 'service1', default_hourly_rate: 50 },
    { key: 'service2', default_hourly_rate: null },
  ];

  it('should return custom hourly rate when provided', () => {
    const result = calculateFinalHourlyRate(
      { service_key: 'service1', markup_percentage: 10, custom_hourly_rate: 75 },
      mockServices
    );
    expect(result).toBe(75);
  });

  it('should apply markup to default rate when no custom rate', () => {
    const result = calculateFinalHourlyRate(
      { service_key: 'service1', markup_percentage: 20, custom_hourly_rate: null },
      mockServices
    );
    expect(result).toBe(60); // 50 * 1.2
  });

  it('should return null when service key not found', () => {
    const result = calculateFinalHourlyRate(
      { service_key: 'unknown', markup_percentage: 10, custom_hourly_rate: null },
      mockServices
    );
    expect(result).toBeNull();
  });

  it('should return null when service has no default rate', () => {
    const result = calculateFinalHourlyRate(
      { service_key: 'service2', markup_percentage: 10, custom_hourly_rate: null },
      mockServices
    );
    expect(result).toBeNull();
  });
});

describe('calculateTotalCost', () => {
  it('should calculate total cost correctly', () => {
    expect(calculateTotalCost(8, 50)).toBe(400);
    expect(calculateTotalCost(1.5, 100)).toBe(150);
  });

  it('should return null for invalid inputs', () => {
    expect(calculateTotalCost(null, 50)).toBeNull();
    expect(calculateTotalCost(8, null)).toBeNull();
    expect(calculateTotalCost(0, 50)).toBeNull();
    expect(calculateTotalCost(8, 0)).toBeNull();
    expect(calculateTotalCost(-1, 50)).toBeNull();
  });
});
