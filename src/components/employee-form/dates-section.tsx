"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { EmployeeFormValues } from "../employee-form";

interface EmployeeDatesSectionProps {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
}

export function EmployeeDatesSection({ form }: EmployeeDatesSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Geburtsdatum</Label>
          <Controller
            name="date_of_birth"
            control={form.control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
        </div>
        <div>
          <Label>Einstellungsdatum</Label>
          <Controller
            name="hire_date"
            control={form.control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Vertragsbeginn</Label>
          <Controller
            name="start_date"
            control={form.control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
        </div>
        <div>
          <Label>Vertragsende</Label>
          <Controller
            name="contract_end_date"
            control={form.control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
        </div>
      </div>
    </>
  );
}