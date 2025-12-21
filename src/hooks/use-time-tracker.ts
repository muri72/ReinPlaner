/**
 * Custom Hook for Time Tracking Logic
 *
 * Extracted from employee-time-tracker.tsx
 * Handles time tracking state and operations.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { formatLiveTime } from "@/lib/utils/time-tracking-utils";

interface UseTimeTrackerReturn {
  // State
  elapsedTime: number;
  displayTime: string;
  isRunning: boolean;

  // Actions
  start: () => void;
  stop: () => void;
  reset: () => void;
  setElapsedTime: (seconds: number) => void;
}

/**
 * Custom hook for managing stopwatch/timer functionality
 */
export function useTimeTracker(initialSeconds: number = 0): UseTimeTrackerReturn {
  const [elapsedTime, setElapsedTimeState] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [displayTime, setDisplayTime] = useState(formatLiveTime(initialSeconds));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update display time whenever elapsedTime changes
  useEffect(() => {
    setDisplayTime(formatLiveTime(elapsedTime));
  }, [elapsedTime]);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTimeState(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedTimeState(0);
  }, []);

  const setElapsedTime = useCallback((seconds: number) => {
    setElapsedTimeState(seconds);
  }, []);

  return {
    elapsedTime,
    displayTime,
    isRunning,
    start,
    stop,
    reset,
    setElapsedTime,
  };
}

/**
 * Hook for tracking active time entry
 */
export function useActiveTimeEntry() {
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveEntry = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Implementation would fetch from Supabase
      // This is a placeholder for the actual implementation
      setActiveEntry(null);
    } catch (error) {
      console.error("Error fetching active entry:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    activeEntry,
    setActiveEntry,
    loading,
    fetchActiveEntry,
  };
}

/**
 * Hook for managing location tracking
 */
export function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.message);
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    currentLocation,
    locationError,
    refetch: getCurrentLocation,
  };
}
