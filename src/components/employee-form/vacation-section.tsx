"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmployeeFormValues } from "../employee-form";

interface EmployeeVacationSectionProps {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
}

export function EmployeeVacationSection({ form }: EmployeeVacationSectionProps) {
  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Urlaub & Arbeitszeit</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="working_days_per_week">Arbeitstage pro Woche</Label>
          <Input
            id="working_days_per_week"
            type="number"
            min="1"
            max="7"
            {...form.register("working_days_per_week")}
          />
          {form.formState.errors.working_days_per_week && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.working_days_per_week.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Anzahl der Arbeitstage pro Woche (1-7)</p>
        </div>
        <div>
          <Label htmlFor="vacation_balance">Urlaubstage pro Jahr</Label>
          <Input
            id="vacation_balance"
            type="number"
            min="0"
            step="0.5"
            {...form.register("vacation_balance")}
          />
          <p className="text-xs text-muted-foreground mt-1">Gesamturlaubstage im Jahr</p>
        </div>
        <div>
          <Label htmlFor="contract_hours_per_week">Vertragliche Stunden/Woche</Label>
          <Input
            id="contract_hours_per_week"
            type="number"
            min="0"
            max="60"
            step="0.5"
            {...form.register("contract_hours_per_week")}
          />
          <p className="text-xs text-muted-foreground mt-1">Vertragliche Arbeitsstunden pro Woche</p>
        </div>
      </div>
    </div>
  );
}