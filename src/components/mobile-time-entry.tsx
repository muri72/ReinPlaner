"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, Square, MapPin, Calendar } from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { createTimeEntry, stopTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/use-geolocation";

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  type: string;
  notes: string | null;
  orders?: { title: string } | null;
  objects?: { name: string } | null;
}

interface MobileTimeEntryProps {
  currentUserId: string;
  isAdmin: boolean;
  onEntryCreated?: () => void;
}

export function MobileTimeEntry({ currentUserId, isAdmin, onEntryCreated }: MobileTimeEntryProps) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { location, requestLocation, error: locationError } = useGeolocation();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeEntry) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(activeEntry.start_time);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeEntry]);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const now = new Date();
      const entryData = {
        startDate: now,
        startTime: now.toTimeString().slice(0, 5),
        type: 'clock_in_out' as const,
        clockInLatitude: location?.latitude || null,
        clockInLongitude: location?.longitude || null,
        locationDeviationWarning: locationError ? true : false,
      };

      const result = await createTimeEntry(entryData);
      if (result.success && result.newEntryId) {
        // Create a temporary entry object for display
        const tempEntry: TimeEntry = {
          id: result.newEntryId,
          start_time: now.toISOString(),
          end_time: null,
          duration_minutes: null,
          type: 'clock_in_out',
          notes: null,
        };
        setActiveEntry(tempEntry);
        setIsRunning(true);
        toast.success("Zeiterfassung gestartet");
        onEntryCreated?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Starten der Zeiterfassung");
    }
  };

  const handlePause = async () => {
    if (!activeEntry) return;
    
    try {
      const result = await stopTimeEntry(activeEntry.id);
      if (result.success) {
        setIsRunning(false);
        toast.success("Zeiterfassung pausiert");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Pausieren");
    }
  };

  const handleResume = async () => {
    if (!activeEntry) return;
    
    try {
      const now = new Date();
      const entryData = {
        startDate: now,
        startTime: now.toTimeString().slice(0, 5),
        type: 'clock_in_out' as const,
        notes: activeEntry.notes,
      };

      const result = await createTimeEntry(entryData);
      if (result.success && result.newEntryId) {
        // Create a temporary entry object for display
        const tempEntry: TimeEntry = {
          id: result.newEntryId,
          start_time: now.toISOString(),
          end_time: null,
          duration_minutes: null,
          type: 'clock_in_out',
          notes: activeEntry.notes,
        };
        setActiveEntry(tempEntry);
        setIsRunning(true);
        toast.success("Zeiterfassung fortgesetzt");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Fortsetzen");
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    
    try {
      const result = await stopTimeEntry(activeEntry.id);
      if (result.success) {
        setActiveEntry(null);
        setIsRunning(false);
        setElapsedTime(0);
        toast.success("Zeiterfassung beendet");
        onEntryCreated?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Beenden");
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Zeiterfassung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            {activeEntry ? (
              <div className="space-y-2">
                <div className="text-2xl font-mono font-bold text-primary">
                  {formatElapsedTime(elapsedTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(activeEntry.start_time), 'HH:mm', { locale: de })} - Laufend
                </div>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? "Aktiv" : "Pausiert"}
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-mono font-bold text-muted-foreground">
                  00:00:00
                </div>
                <div className="text-sm text-muted-foreground">
                  Nicht aktiv
                </div>
                <Badge variant="outline">
                  Gestoppt
                </Badge>
              </div>
            )}
          </div>

          {/* Location Info */}
          {(location || locationError) && (
            <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {locationError ? "Standort nicht verfügbar" : "Standort erfasst"}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {!activeEntry ? (
              <Button
                onClick={handleStart}
                className="w-full h-12 flex flex-col items-center justify-center"
                size="lg"
              >
                <Play className="h-5 w-5 mb-1" />
                <span className="text-xs">Start</span>
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button
                    onClick={handlePause}
                    variant="secondary"
                    className="w-full h-12 flex flex-col items-center justify-center"
                    size="lg"
                  >
                    <Pause className="h-5 w-5 mb-1" />
                    <span className="text-xs">Pause</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    variant="secondary"
                    className="w-full h-12 flex flex-col items-center justify-center"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mb-1" />
                    <span className="text-xs">Fortsetzen</span>
                  </Button>
                )}
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="w-full h-12 flex flex-col items-center justify-center"
                  size="lg"
                >
                  <Square className="h-5 w-5 mb-1" />
                  <span className="text-xs">Stopp</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Entry Details */}
      {activeEntry && (
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-base">Aktueller Eintrag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start:</span>
                <span className="font-medium">
                  {format(new Date(activeEntry.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                </span>
              </div>
              {activeEntry.orders && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auftrag:</span>
                  <span className="font-medium truncate">{activeEntry.orders.title}</span>
                </div>
              )}
              {activeEntry.objects && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objekt:</span>
                  <span className="font-medium truncate">{activeEntry.objects.name}</span>
                </div>
              )}
              {activeEntry.notes && (
                <div>
                  <span className="text-muted-foreground">Notizen:</span>
                  <p className="font-medium mt-1">{activeEntry.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}