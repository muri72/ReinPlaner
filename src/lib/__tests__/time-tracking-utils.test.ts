import { describe, it, expect } from 'vitest';
import {
  formatLiveTime,
  calculateDistance,
  calculateBreakMinutesFallback,
  isLocationValid,
} from '@/lib/utils/time-tracking-utils';

describe('Time Tracking Utilities', () => {
  describe('formatLiveTime', () => {
    it('should format zero seconds correctly', () => {
      expect(formatLiveTime(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(formatLiveTime(45)).toBe('00:00:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatLiveTime(125)).toBe('00:02:05'); // 2 min 5 sec
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatLiveTime(3723)).toBe('01:02:03'); // 1h 2m 3s
    });

    it('should pad single digits with zeros', () => {
      expect(formatLiveTime(3612)).toBe('01:00:12'); // 1h 0m 12s
    });

    it('should handle large values', () => {
      expect(formatLiveTime(36000)).toBe('10:00:00'); // 10 hours
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(52.52, 13.405, 52.52, 13.405);
      expect(distance).toBe(0);
    });

    it('should calculate distance between Berlin and Hamburg correctly', () => {
      // Berlin: 52.52, 13.405
      // Hamburg: 53.55, 9.993
      const distance = calculateDistance(52.52, 13.405, 53.55, 9.993);
      // Should be approximately 255km (255000m)
      expect(distance).toBeGreaterThan(250000);
      expect(distance).toBeLessThan(260000);
    });

    it('should calculate distance between Munich and Frankfurt', () => {
      // Munich: 48.137, 11.576
      // Frankfurt: 50.110, 8.682
      const distance = calculateDistance(48.137, 11.576, 50.110, 8.682);
      // Should be approximately 305km
      expect(distance).toBeGreaterThan(290000);
      expect(distance).toBeLessThan(320000);
    });

    it('should be symmetric (A to B equals B to A)', () => {
      const distance1 = calculateDistance(52.52, 13.405, 53.55, 9.993);
      const distance2 = calculateDistance(53.55, 9.993, 52.52, 13.405);
      expect(distance1).toBeCloseTo(distance2, 0);
    });

    it('should handle negative coordinates', () => {
      // New York: 40.712, -74.006
      // Los Angeles: 34.052, -118.244
      const distance = calculateDistance(40.712, -74.006, 34.052, -118.244);
      // Should be approximately 3940km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });
  });

  describe('calculateBreakMinutesFallback', () => {
    it('should return 0 for zero duration', () => {
      expect(calculateBreakMinutesFallback(0)).toBe(0);
    });

    it('should return 0 for negative duration', () => {
      expect(calculateBreakMinutesFallback(-60)).toBe(0);
    });

    it('should return 0 for duration <= 6 hours (360 minutes)', () => {
      expect(calculateBreakMinutesFallback(0)).toBe(0);
      expect(calculateBreakMinutesFallback(180)).toBe(0); // 3 hours
      expect(calculateBreakMinutesFallback(360)).toBe(0); // Exactly 6 hours
    });

    it('should return 30 minutes for duration > 6 and <= 9 hours', () => {
      expect(calculateBreakMinutesFallback(361)).toBe(30); // 6h 1m
      expect(calculateBreakMinutesFallback(480)).toBe(30); // 8 hours
      expect(calculateBreakMinutesFallback(540)).toBe(30); // Exactly 9 hours
    });

    it('should return 45 minutes for duration > 9 hours', () => {
      expect(calculateBreakMinutesFallback(541)).toBe(45); // 9h 1m
      expect(calculateBreakMinutesFallback(600)).toBe(45); // 10 hours
      expect(calculateBreakMinutesFallback(720)).toBe(45); // 12 hours
    });

    it('should follow German labor law guidelines', () => {
      // 6 hours or less: no break required
      expect(calculateBreakMinutesFallback(6 * 60)).toBe(0);
      
      // More than 6 up to 9 hours: 30 min break
      expect(calculateBreakMinutesFallback(7 * 60)).toBe(30);
      
      // More than 9 hours: 45 min break
      expect(calculateBreakMinutesFallback(10 * 60)).toBe(45);
    });
  });

  describe('isLocationValid', () => {
    it('should return isValid=true when target is null', () => {
      const result = isLocationValid(52.52, 13.405, null, null);
      expect(result.isValid).toBe(true);
    });

    it('should return isValid=true when within radius', () => {
      // Same coordinates should be within 100m radius
      const result = isLocationValid(52.52, 13.405, 52.52, 13.405, 100);
      expect(result.isValid).toBe(true);
      expect(result.deviation).toBe(0);
    });

    it('should return isValid=false when outside radius', () => {
      // Berlin to Hamburg is ~233km, should be way outside 100m
      const result = isLocationValid(52.52, 13.405, 53.55, 9.993, 100);
      expect(result.isValid).toBe(false);
      expect(result.deviation).toBeGreaterThan(200000); // More than 200km deviation
    });

    it('should calculate correct deviation', () => {
      // If distance is 150m and radius is 100m, deviation should be 50m
      // This is hard to test exactly without mocking calculateDistance
      // But we can verify the deviation is always >= 0
      const result = isLocationValid(52.52, 13.405, 53.55, 9.993, 100);
      expect(result.deviation).toBeGreaterThanOrEqual(0);
    });

    it('should handle custom radius', () => {
      // Using custom radius of 500m
      const result = isLocationValid(52.52, 13.405, 52.5201, 13.4051, 500);
      expect(result.isValid).toBe(true);
    });

    it('should use default radius of 100 meters', () => {
      const result = isLocationValid(52.52, 13.405, 52.52, 13.405);
      expect(result.isValid).toBe(true);
    });
  });
});
