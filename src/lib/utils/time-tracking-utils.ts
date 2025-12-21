/**
 * Time Tracking Utilities
 *
 * Extracted from employee-time-tracker.tsx
 * Contains helper functions for time tracking operations.
 */

/**
 * Format seconds into HH:MM:SS for live display
 */
export const formatLiveTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance;
};

/**
 * Calculate break minutes based on gross duration
 * Following German labor law guidelines
 */
export const calculateBreakMinutesFallback = (grossDurationMinutes: number): number => {
  if (grossDurationMinutes <= 0) return 0;

  // German labor law: 30 min break for 6-9 hours, 45 min break for >9 hours
  if (grossDurationMinutes <= 360) {
    // 6 hours or less
    return 0;
  } else if (grossDurationMinutes <= 540) {
    // 6-9 hours
    return 30;
  } else {
    // More than 9 hours
    return 45;
  }
};

/**
 * Check if location is within allowed radius
 */
export const isLocationValid = (
  currentLat: number,
  currentLon: number,
  targetLat: number | null,
  targetLon: number | null,
  allowedRadiusMeters: number = 100
): { isValid: boolean; deviation?: number } => {
  if (targetLat === null || targetLon === null) {
    return { isValid: true };
  }

  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  const deviation = distance - allowedRadiusMeters;

  return {
    isValid: deviation <= 0,
    deviation: Math.max(0, deviation),
  };
};
