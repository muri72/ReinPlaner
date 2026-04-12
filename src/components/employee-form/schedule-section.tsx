"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { dayNames, germanDayNames } from "@/lib/utils/form-utils";
import { EmployeeFormValues } from "../employee-form";

interface EmployeeScheduleSectionProps {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
  totalWeeklyHours: string;
  scheduleVersion: number;
}

export function EmployeeScheduleSection({ form, totalWeeklyHours, scheduleVersion }: EmployeeScheduleSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Standard-Wochenstunden</h3>
      <p className="text-sm text-muted-foreground">
        Legen Sie die standardmäßigen Arbeitsstunden für jeden Wochentag fest. Diese Zeiten werden für die Verfügbarkeitsplanung verwendet.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 border rounded-lg bg-muted/20">
        {dayNames.map(day => (
          <div key={day}>
            <Label htmlFor={`default_daily_schedules.0.${day}.hours`} className="text-sm font-medium">{germanDayNames[day]}</Label>
            <Input
              key={`schedule-${scheduleVersion}`}
              id={`default_daily_schedules.0.${day}.hours`}
              type="number"
              step="0.25"
              min="0"
              max="24"
              placeholder="Std."
              {...form.register(`default_daily_schedules.0.${day}.hours`)}
            />
          </div>
        ))}
      </div>
      <div className="font-semibold">Gesamtstunden pro Woche: {totalWeeklyHours}h</div>
    </div>
  );
}