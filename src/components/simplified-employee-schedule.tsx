"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const germanDayNames: { [key: string]: string } = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

interface SimplifiedSchedule {
  [key: string]: {
    hours: number | null;
    start: string | null;
    end: string | null;
  };
}

interface SimplifiedEmployeeScheduleProps {
  employeeName: string;
  recurrenceInterval: number;
  onScheduleChange: (schedules: SimplifiedSchedule[]) => void;
  initialSchedules?: SimplifiedSchedule[];
  objectSchedules?: any[];
}

export function SimplifiedEmployeeSchedule({
  employeeName,
  recurrenceInterval,
  onScheduleChange,
  initialSchedules = [],
  objectSchedules = [],
}: SimplifiedEmployeeScheduleProps) {
  const [schedules, setSchedules] = useState<SimplifiedSchedule[]>(initialSchedules);

  // Initialize schedules based on recurrence interval
  useEffect(() => {
    if (initialSchedules.length > 0) {
      setSchedules(initialSchedules);
    } else {
      // Create empty schedules for each week
      const newSchedules: SimplifiedSchedule[] = [];
      for (let i = 0; i < recurrenceInterval; i++) {
        const weekSchedule: SimplifiedSchedule = {};
        dayNames.forEach(day => {
          const objectDaySchedule = objectSchedules?.[i]?.[day];
          if (objectDaySchedule?.hours) {
            weekSchedule[day] = {
              hours: null, // Start with null, user fills in
              start: objectDaySchedule.start || null,
              end: objectDaySchedule.end || null,
            };
          }
        });
        newSchedules.push(weekSchedule);
      }
      setSchedules(newSchedules);
    }
  }, [recurrenceInterval, initialSchedules, objectSchedules]);

  // Notify parent of changes
  useEffect(() => {
    onScheduleChange(schedules);
  }, [schedules, onScheduleChange]);

  const handleHoursChange = (weekIndex: number, day: string, value: string) => {
    const newSchedules = [...schedules];
    if (!newSchedules[weekIndex][day]) {
      newSchedules[weekIndex][day] = { hours: null, start: null, end: null };
    }
    newSchedules[weekIndex][day].hours = value === "" ? null : Number(value);
    setSchedules(newSchedules);
  };

  const handleStartTimeChange = (weekIndex: number, day: string, value: string) => {
    const newSchedules = [...schedules];
    if (!newSchedules[weekIndex][day]) {
      newSchedules[weekIndex][day] = { hours: null, start: null, end: null };
    }
    newSchedules[weekIndex][day].start = value || null;
    setSchedules(newSchedules);
  };

  const handleEndTimeChange = (weekIndex: number, day: string, value: string) => {
    const newSchedules = [...schedules];
    if (!newSchedules[weekIndex][day]) {
      newSchedules[weekIndex][day] = { hours: null, start: null, end: null };
    }
    newSchedules[weekIndex][day].end = value || null;
    setSchedules(newSchedules);
  };

  const copyWeekToAll = (sourceWeekIndex: number) => {
    if (recurrenceInterval === 1) return;

    const sourceSchedule = schedules[sourceWeekIndex];
    const newSchedules = [...schedules];

    for (let i = 0; i < recurrenceInterval; i++) {
      if (i !== sourceWeekIndex) {
        newSchedules[i] = { ...sourceSchedule };
      }
    }

    setSchedules(newSchedules);
  };

  const copyDayToAllWeeks = (weekIndex: number, day: string) => {
    if (recurrenceInterval === 1) return;

    const sourceDaySchedule = schedules[weekIndex][day];
    const newSchedules = [...schedules];

    for (let i = 0; i < recurrenceInterval; i++) {
      if (i !== weekIndex) {
        newSchedules[i][day] = { ...sourceDaySchedule };
      }
    }

    setSchedules(newSchedules);
  };

  const getObjectDailyHours = (weekIndex: number, day: string): number | null => {
    return objectSchedules?.[weekIndex]?.[day]?.hours || null;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{employeeName}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {recurrenceInterval === 1
                    ? "Arbeitszeiten für jede Woche"
                    : `Arbeitszeiten für einen ${recurrenceInterval}-Wochen-Zyklus`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {schedules.map((weekSchedule, weekIndex) => (
          <div key={weekIndex} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                {recurrenceInterval === 1
                  ? "Woche"
                  : `Woche ${weekIndex + 1} von ${recurrenceInterval}`}
              </h4>
              {recurrenceInterval > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyWeekToAll(weekIndex)}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  In alle Wochen kopieren
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dayNames.map(day => {
                const objectDailyHours = getObjectDailyHours(weekIndex, day);
                if (!objectDailyHours) return null;

                const daySchedule = weekSchedule[day] || {};

                return (
                  <div key={day} className="border rounded-md p-3 space-y-2 bg-background">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">{germanDayNames[day]}</h5>
                      {recurrenceInterval > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyDayToAllWeeks(weekIndex, day)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`hours-${weekIndex}-${day}`} className="text-xs">
                          Stunden
                        </Label>
                        <Input
                          id={`hours-${weekIndex}-${day}`}
                          type="number"
                          step="0.25"
                          min="0"
                          max={objectDailyHours}
                          placeholder="0"
                          value={daySchedule.hours ?? ""}
                          onChange={(e) =>
                            handleHoursChange(weekIndex, day, e.target.value)
                          }
                          className="w-full text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Max: {objectDailyHours}h
                        </p>
                      </div>

                      <div>
                        <Label htmlFor={`start-${weekIndex}-${day}`} className="text-xs">
                          Startzeit
                        </Label>
                        <Input
                          id={`start-${weekIndex}-${day}`}
                          type="time"
                          value={daySchedule.start ?? ""}
                          onChange={(e) =>
                            handleStartTimeChange(weekIndex, day, e.target.value)
                          }
                          className="w-full text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`end-${weekIndex}-${day}`} className="text-xs">
                          Endzeit
                        </Label>
                        <Input
                          id={`end-${weekIndex}-${day}`}
                          type="time"
                          value={daySchedule.end ?? ""}
                          onChange={(e) =>
                            handleEndTimeChange(weekIndex, day, e.target.value)
                          }
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Info box for recurring orders */}
        {recurrenceInterval > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Hinweis:</strong> Dieser Auftrag findet alle {recurrenceInterval} Wochen statt.
              Die Arbeitszeiten werden im obigen {recurrenceInterval}-Wochen-Zyklus definiert.
              {recurrenceInterval === 2 && " Mitarbeiter A arbeitet in Woche 1, Mitarbeiter B in Woche 2, und dann wiederholt sich der Zyklus."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
