"use client";

import React from "react";
import { UseFormReturn, Controller, useFieldArray } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { calculateEndTime, calculateStartTime, dayNames, germanDayNames, timeRegex } from "@/lib/utils/form-utils";
import { Building2 } from "lucide-react";

interface ObjectOption {
  id: string;
  name: string;
  address?: string;
  daily_schedules?: any[];
}

interface ShiftScheduleEditorProps {
  form: UseFormReturn<any>;
  selectedObject: ObjectOption | undefined;
  recurrenceInterval: number;
  startWeekOffset: number;
  importSchedules: boolean;
}

const handleDailyHoursChange = (
  form: UseFormReturn<any>,
  weekIndex: number,
  day: string,
  value: string,
  calculateEndTimeFn: typeof calculateEndTime
) => {
  const parsedHours = value === "" ? null : Number(value);
  const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
  form.setValue(
    `assigned_daily_schedules.${weekIndex}.${day}`,
    { ...currentSchedule, hours: parsedHours },
    { shouldValidate: true }
  );
  const startTime = currentSchedule.start;
  if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
    form.setValue(
      `assigned_daily_schedules.${weekIndex}.${day}.end`,
      calculateEndTimeFn(startTime, parsedHours),
      { shouldValidate: true }
    );
  }
};

const handleDailyStartTimeChange = (
  form: UseFormReturn<any>,
  weekIndex: number,
  day: string,
  value: string,
  calculateEndTimeFn: typeof calculateEndTime
) => {
  const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
  form.setValue(
    `assigned_daily_schedules.${weekIndex}.${day}`,
    { ...currentSchedule, start: value || null },
    { shouldValidate: true }
  );
  const hoursRaw = (currentSchedule as any).hours;
  const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw ?? NaN);
  if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
    form.setValue(
      `assigned_daily_schedules.${weekIndex}.${day}.end`,
      calculateEndTimeFn(value, hours),
      { shouldValidate: true }
    );
  }
};

const handleDailyEndTimeChange = (
  form: UseFormReturn<any>,
  weekIndex: number,
  day: string,
  value: string,
  calculateStartTimeFn: typeof calculateStartTime
) => {
  const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
  form.setValue(
    `assigned_daily_schedules.${weekIndex}.${day}`,
    { ...currentSchedule, end: value || null },
    { shouldValidate: true }
  );
  const hoursRaw = (currentSchedule as any).hours;
  const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw ?? NaN);
  if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
    form.setValue(
      `assigned_daily_schedules.${weekIndex}.${day}.start`,
      calculateStartTimeFn(value, hours),
      { shouldValidate: true }
    );
  }
};

export function ShiftScheduleEditor({
  form,
  selectedObject,
  recurrenceInterval,
  startWeekOffset,
  importSchedules,
}: ShiftScheduleEditorProps) {
  const { fields: dailySchedulesFields, replace: replaceDailySchedules } = useFieldArray({
    control: form.control,
    name: "assigned_daily_schedules",
  });

  const getObjectWorkingHours = (day: string) => {
    if (!selectedObject?.daily_schedules?.[0]?.[day]) return null;
    return selectedObject.daily_schedules[0][day].hours || 0;
  };

  const handleImportSchedulesToggle = (checked: boolean) => {
    if (checked && selectedObject?.daily_schedules?.length) {
      const objectSchedules = selectedObject.daily_schedules[0];
      dailySchedulesFields.forEach((_, weekIndex) => {
        dayNames.forEach((day) => {
          const daySchedule = objectSchedules[day];
          if (daySchedule && typeof daySchedule.hours === "number" && daySchedule.hours > 0) {
            form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, {
              hours: daySchedule.hours,
              start: daySchedule.start || "08:00",
              end:
                daySchedule.end ||
                calculateEndTime(daySchedule.start || "08:00", daySchedule.hours),
            });
          } else {
            form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, {
              hours: null,
              start: null,
              end: null,
            });
          }
        });
      });
    } else {
      dailySchedulesFields.forEach((_, weekIndex) => {
        dayNames.forEach((day) => {
          form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, {
            hours: null,
            start: null,
            end: null,
          });
        });
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Zeitplan</h3>

      {/* Import Object Schedules Toggle */}
      <div className="flex items-center gap-2">
        <Controller
          name="importSchedules"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              id="importSchedules"
              checked={field.value}
              disabled={!selectedObject || !selectedObject.daily_schedules?.length}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
                handleImportSchedulesToggle(checked === true);
              }}
            />
          )}
        />
        <Label htmlFor="importSchedules" className="text-sm cursor-pointer">
          Zeitplan vom Objekt übernehmen
        </Label>
        {!selectedObject?.daily_schedules?.length && (
          <span className="text-xs text-muted-foreground">(keine Zeitpläne vorhanden)</span>
        )}
      </div>

      {/* Recurrence Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
        <div>
          <Label htmlFor="assigned_recurrence_interval_weeks">
            Wiederholt sich alle X Wochen
          </Label>
          <Controller
            name="assigned_recurrence_interval_weeks"
            control={form.control}
            render={({ field }) => (
              <Input
                id="assigned_recurrence_interval_weeks"
                type="number"
                step="1"
                min="1"
                max="52"
                value={Number(field.value) || 1}
                onChange={(e) => field.onChange(Number(e.target.value) || 1)}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="assigned_start_week_offset">
            Start-Wochen-Offset (0-basierend)
          </Label>
          <Controller
            name="assigned_start_week_offset"
            control={form.control}
            render={({ field }) => (
              <Input
                id="assigned_start_week_offset"
                type="number"
                step="1"
                min="0"
                max={recurrenceInterval > 1 ? recurrenceInterval - 1 : 0}
                value={Number(field.value) || 0}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
        </div>
      </div>

      {/* Dynamic Week Schedules */}
      {dailySchedulesFields.map((weekSchedule, weekIndex) => (
        <div
          key={weekSchedule.id}
          className="border p-4 rounded-md space-y-4 bg-muted/20"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">
              Woche {weekIndex + 1} (Offset {(startWeekOffset + weekIndex) % recurrenceInterval})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dayNames.map((day) => {
              const hoursFieldName = `assigned_daily_schedules.${weekIndex}.${day}.hours` as const;
              const startFieldName = `assigned_daily_schedules.${weekIndex}.${day}.start` as const;
              const endFieldName = `assigned_daily_schedules.${weekIndex}.${day}.end` as const;

              const objectHours = getObjectWorkingHours(day);
              const assignedHours = form.getValues(hoursFieldName);

              return (
                <div key={day} className="border p-3 rounded-md space-y-2 relative">
                  <h5 className="font-medium text-sm">{germanDayNames[day]}</h5>

                  {objectHours !== null && objectHours > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Objekt: {objectHours.toFixed(2)}h
                    </div>
                  )}

                  <div>
                    <Label htmlFor={hoursFieldName} className="text-xs">
                      Stunden
                    </Label>
                    <Controller
                      name={hoursFieldName}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          id={hoursFieldName}
                          type="number"
                          step="0.01"
                          min="0"
                          max="24"
                          value={Number(field.value) || 0}
                          onChange={(e) => {
                            field.onChange(e);
                            handleDailyHoursChange(
                              form,
                              weekIndex,
                              day,
                              e.target.value,
                              calculateEndTime
                            );
                          }}
                          className={cn(
                            objectHours !== null &&
                              assignedHours !== objectHours &&
                              assignedHours !== undefined &&
                              assignedHours !== null
                              ? "border-amber-500/50 focus-visible:border-amber-500"
                              : ""
                          )}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor={startFieldName} className="text-xs">
                      Startzeit
                    </Label>
                    <Controller
                      name={startFieldName}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          id={startFieldName}
                          type="time"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e);
                            handleDailyStartTimeChange(
                              form,
                              weekIndex,
                              day,
                              e.target.value,
                              calculateEndTime
                            );
                          }}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor={endFieldName} className="text-xs">
                      Endzeit
                    </Label>
                    <Controller
                      name={endFieldName}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          id={endFieldName}
                          type="time"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e);
                            handleDailyEndTimeChange(
                              form,
                              weekIndex,
                              day,
                              e.target.value,
                              calculateStartTime
                            );
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Object Working Hours Overview */}
      {selectedObject?.daily_schedules?.[0] && (
        <div className="border p-4 rounded-md bg-muted/10">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Objektarbeitszeiten Übersicht
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day) => {
              const hours = getObjectWorkingHours(day);
              if (hours === null) return null;
              return (
                <div key={day} className="text-center">
                  <div className="text-xs text-muted-foreground">{germanDayNames[day]}</div>
                  <div className="text-sm font-medium">{hours.toFixed(2)}h</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
