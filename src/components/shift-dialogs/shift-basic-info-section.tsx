"use client";

import React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Clock, CalendarRange } from "lucide-react";

interface ShiftBasicInfoSectionProps {
  form: UseFormReturn<any>;
}

const calculateDurationHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return Math.round((diffMinutes / 60) * 100) / 100;
};

const calculateTotalHours = (
  startTime: string,
  endTime: string,
  travelMinutes: number,
  breakMinutes: number
): number => {
  const duration = calculateDurationHours(startTime, endTime);
  const travelHours = travelMinutes / 60;
  const breakHours = breakMinutes / 60;
  return Math.round((duration + travelHours - breakHours) * 100) / 100;
};

export function ShiftBasicInfoSection({ form }: ShiftBasicInfoSectionProps) {
  const shiftType = form.getValues("shiftType");
  const startTime = form.getValues("startTime") || "00:00";
  const endTime = form.getValues("endTime") || "00:00";
  const travelMinutes = Number(form.getValues("travelTimeMinutes") || 0);
  const breakMinutes = Number(form.getValues("breakTimeMinutes") || 0);

  const durationHours = calculateDurationHours(startTime, endTime);
  const totalHours = calculateTotalHours(startTime, endTime, travelMinutes, breakMinutes);

  return (
    <div className="space-y-4">
      {/* Shift Type Toggle */}
      <div className="flex items-center gap-4">
        <Label className="text-sm text-muted-foreground">Einsatzart:</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => form.setValue("shiftType", "single")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              shiftType === "single"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5 inline" />
            Einmalig
          </button>
          <button
            type="button"
            onClick={() => form.setValue("shiftType", "recurring")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              shiftType === "recurring"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <CalendarRange className="h-3.5 w-3.5 mr-1.5 inline" />
            Wiederholend
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className={cn("grid gap-3", shiftType === "recurring" ? "grid-cols-2" : "grid-cols-1")}>
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            {shiftType === "recurring" ? "Startdatum" : "Datum"}
          </Label>
          <Controller
            name="shiftDate"
            control={form.control}
            render={({ field }) => <Input type="date" {...field} />}
          />
        </div>
        {shiftType === "recurring" && (
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Enddatum</Label>
            <Controller
              name="endDate"
              control={form.control}
              render={({ field }) => (
                <Input type="date" {...field} min={form.getValues("shiftDate")} />
              )}
            />
          </div>
        )}
      </div>

      {/* Single Shift Time Inputs */}
      {shiftType === "single" && (
        <>
          {/* Start and End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime" className="text-sm text-muted-foreground mb-1.5 block">
                Von
              </Label>
              <Controller
                name="startTime"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="startTime"
                    type="time"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                    }}
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm text-muted-foreground mb-1.5 block">
                Bis
              </Label>
              <Controller
                name="endTime"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="endTime"
                    type="time"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Duration Display */}
          <div className="p-4 rounded-lg border bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Dauer</span>
              <span className="text-lg font-semibold">{durationHours} Std.</span>
            </div>
          </div>

          {/* Travel Time and Break Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="travelTimeMinutes" className="text-sm text-muted-foreground mb-1.5 block">
                Fahrtzeit (Min.)
              </Label>
              <Controller
                name="travelTimeMinutes"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="travelTimeMinutes"
                    type="number"
                    min="0"
                    value={Number(field.value) || 0}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                    }}
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="breakTimeMinutes" className="text-sm text-muted-foreground mb-1.5 block">
                Pausenzeit (Min.)
              </Label>
              <Controller
                name="breakTimeMinutes"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="breakTimeMinutes"
                    type="number"
                    min="0"
                    value={Number(field.value) || 0}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Total Working Hours */}
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Lohnzeit (Gesamt)</span>
              <span className="text-xl font-bold text-primary">{totalHours} Std.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { calculateDurationHours, calculateTotalHours };
