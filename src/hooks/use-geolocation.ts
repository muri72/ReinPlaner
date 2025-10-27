"use client";

import { useState, useEffect } from "react";

interface Location {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  location: Location | null;
  error: string | null;
  isLoading: boolean;
  requestLocation: () => void;
  watchLocation: (enabled: boolean) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000, // 1 minute
  } = options;

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation wird von diesem Browser nicht unterstützt');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setIsLoading(false);
      },
      (error) => {
        let errorMessage = 'Unbekannter Fehler';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Standortzugriff verweigert';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Standortinformationen nicht verfügbar';
            break;
          case error.TIMEOUT:
            errorMessage = 'Standortanfrage timeout';
            break;
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  };

  const watchLocation = (enabled: boolean) => {
    if (!navigator.geolocation) {
      setError('Geolocation wird von diesem Browser nicht unterstützt');
      return;
    }

    if (enabled) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let errorMessage = 'Unbekannter Fehler';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Standortzugriff verweigert';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Standortinformationen nicht verfügbar';
              break;
            case error.TIMEOUT:
              errorMessage = 'Standortanfrage timeout';
              break;
          }
          setError(errorMessage);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
      setWatchId(id);
    } else if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    isLoading,
    requestLocation,
    watchLocation,
  };
}