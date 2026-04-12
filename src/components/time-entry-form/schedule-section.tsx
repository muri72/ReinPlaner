"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { TimeEntryFormValues } from "@/lib/utils/form-utils";

interface TimeEntryScheduleSectionProps {
  form: ReturnType<typeof useForm<TimeEntryFormValues>>;
}

export function TimeEntryScheduleSection({ form }: TimeEntryScheduleSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Datum</Label>
          <Controller
            name="startDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div>
          <Label htmlFor="startTime">Startzeit</Label>
          <Input
            id="startTime"
            type="time"
            {...form.register("startTime")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Enddatum</Label>
          <Controller
            name="endDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div>
          <Label htmlFor="endTime">Endzeit</Label>
          <Input
            id="endTime"
            type="time"
            {...form.register("endTime")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="durationMinutes">Dauer (Minuten)</Label>
          <Input
            id="durationMinutes"
            type="number"
            min="0"
            {...form.register("durationMinutes")}
          />
        </div>

        <div>
          <Label htmlFor="breakMinutes">Pause (Minuten)</Label>
          <Input
            id="breakMinutes"
            type="number"
            min="0"
            {...form.register("breakMinutes")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="type">Eingabeart</Label>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuell</SelectItem>
                <SelectItem value="clock_in">Start/Ende</SelectItem>
                <SelectItem value="generated">Automatisch generiert</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </>
  );
}