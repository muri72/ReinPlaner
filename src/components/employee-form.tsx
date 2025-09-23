"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const preprocessNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

// Define daily schedule schema with explicit number type for hours
const dailyScheduleSchema = z.object({
  hours: z.coerce.number().min(0).max(24).optional().nullable(),
  start: z.string().regex(timeRegex, "Ungültiges Format (HH:MM)").or(z.literal("")).optional().nullable(),
  end: z.string().regex(timeRegex, "Ungültiges Format (HH:MM)").or(z.literal("")).optional().nullable(),
});

const weeklyScheduleSchema = z.object({
  monday: dailyScheduleSchema.optional(),
  tuesday: dailyScheduleSchema.optional(),
  wednesday: dailyScheduleSchema.optional(),
  thursday: dailyScheduleSchema.optional(),
  friday: dailyScheduleSchema.optional(),
  saturday: dailyScheduleSchema.optional(),
  sunday: dailyScheduleSchema.optional(),
});

export const employeeSchema = z.object({
  first_name: z.string().min(1, "Vorname ist erforderlich"),
  last_name: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  date_of_birth: z.date().optional().nullable(),
  hire_date: z.date().optional().nullable(),
  start_date: z.date().optional().nullable(),
  contract_end_date: z.date().optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]),
  contract_type: z.enum(["full_time", "part_time", "minijob", "freelancer"]).nullable().optional(),
  hourly_rate: z.coerce.number().min(0).nullable().optional(),
  job_title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  social_security_number: z.string().nullable().optional(),
  tax_id_number: z.string().nullable().optional(),
  health_insurance_provider: z.string().nullable().optional(),
  default_daily_schedules: z.array(weeklyScheduleSchema),
  default_recurrence_interval_weeks: z.coerce.number().min(1).max(52),
  default_start_week_offset: z.coerce.number().min(0).max(51),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormValues>;
  onSubmit: (data: EmployeeFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function EmployeeForm({ initialData, onSubmit, submitButtonText, onSuccess }: EmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      status: "active",
      contract_type: "full_time",
      default_daily_schedules: [{}],
      default_recurrence_interval_weeks: 1,
      default_start_week_offset: 0,
      ...initialData,
    },
    mode: "onChange",
  });

  const handleFormSubmit: SubmitHandler<EmployeeFormValues> = async (data) => {
    const result = await onSubmit(data);
    handleActionResponse(result);
    if (result.success) {
      onSuccess?.();
    }
  };

  const totalWeeklyHours = useMemo(() => {
    const schedules = form.watch('default_daily_schedules');
    if (!schedules || schedules.length === 0 || !schedules[0]) {
      return "0.00";
    }
    const firstWeekSchedule = schedules[0];
    const dayValues = Object.values(firstWeekSchedule);
    if (!dayValues || dayValues.length === 0) {
      return "0.00";
    }
    const total = dayValues.reduce((acc: number, day: any) => {
      const hours = day?.hours;
      return acc + (typeof hours === 'number' && !isNaN(hours) ? hours : 0);
    }, 0);
    return total.toFixed(2);
  }, [form.watch('default_daily_schedules')]);

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">Vorname</Label>
          <Input id="first_name" {...form.register("first_name")} />
          {form.formState.errors.first_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.first_name.message}</p>}
        </div>
        <div>
          <Label htmlFor="last_name">Nachname</Label>
          <Input id="last_name" {...form.register("last_name")} />
          {form.formState.errors.last_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.last_name.message}</p>}
        </div>
      </div>

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
                id={`default_daily_schedules.0.${day}.hours`}
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="Std."
                {...form.register(`default_daily_schedules.0.${day}.hours`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </div>
        <div className="font-semibold">Gesamtstunden pro Woche: {totalWeeklyHours}h</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="job_title">Berufsbezeichnung</Label>
          <Input id="job_title" {...form.register("job_title")} />
        </div>
        <div>
          <Label htmlFor="department">Abteilung</Label>
          <Input id="department" {...form.register("department")} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea id="address" {...form.register("address")} />
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select onValueChange={(value) => form.setValue("status", value as EmployeeFormValues["status"])} value={form.watch("status")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
              <SelectItem value="on_leave">Beurlaubt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="contract_type">Vertragsart</Label>
          <Select 
            onValueChange={(value) => form.setValue("contract_type", value as EmployeeFormValues["contract_type"])} 
            value={form.watch("contract_type") || undefined}
          >
            <SelectTrigger><SelectValue placeholder="Vertragsart auswählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Vollzeit</SelectItem>
              <SelectItem value="part_time">Teilzeit</SelectItem>
              <SelectItem value="minijob">Minijob</SelectItem>
              <SelectItem value="freelancer">Freiberufler</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="hourly_rate">Stundensatz (€)</Label>
        <Input id="hourly_rate" type="number" step="0.01" {...form.register("hourly_rate", { valueAsNumber: true })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="social_security_number">Sozialversicherungsnummer</Label>
          <Input id="social_security_number" {...form.register("social_security_number")} />
        </div>
        <div>
          <Label htmlFor="tax_id_number">Steuer-ID</Label>
          <Input id="tax_id_number" {...form.register("tax_id_number")} />
        </div>
      </div>

      <div>
        <Label htmlFor="health_insurance_provider">Krankenkasse</Label>
        <Input id="health_insurance_provider" {...form.register("health_insurance_provider")} />
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}