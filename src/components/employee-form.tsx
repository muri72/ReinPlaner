"use client";

import { useForm, SubmitHandler, FieldPath, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useCallback } from "react";
import { DatePicker } from "@/components/date-picker"; // Importiere die neue DatePicker Komponente
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const preprocessNumber = (val: unknown) => (val === "" || isNaN(Number(val)) ? null : Number(val));
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

const dailyScheduleSchema = z.object({
  hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
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
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  // KORREKTUR HIER: E-Mail-Schema angepasst, um leere Strings als null zu behandeln
  email: z.union([
    z.string().email("Ungültiges E-Mail-Format"),
    z.literal(""), // Erlaube leeren String
  ]).transform(e => e === "" ? null : e).optional().nullable(),
  phone: z.string().max(50, "Telefonnummer ist zu lang").optional().nullable(),
  hireDate: z.date().optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  contractType: z.enum(["minijob", "part_time", "full_time", "fixed_term"]).default("full_time"), // 'fixed_term' hinzugefügt
  contractEndDate: z.date().optional().nullable(), // Neues Feld
  hourlyRate: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stundenlohn muss positiv sein").max(9999.99, "Stundenlohn ist zu hoch")).optional()
  ),
  startDate: z.date().optional().nullable(),
  jobTitle: z.string().max(100, "Berufsbezeichnung ist zu lang").optional().nullable(),
  department: z.string().max(100, "Abteilung ist zu lang").optional().nullable(),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  // Neue Felder
  address: z.string().max(255, "Adresse ist zu lang").optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  socialSecurityNumber: z.string().max(50, "SV-Nummer ist zu lang").optional().nullable(),
  taxIdNumber: z.string().max(50, "Steuer-ID ist zu lang").optional().nullable(),
  healthInsuranceProvider: z.string().max(100, "Krankenkasse ist zu lang").optional().nullable(),
  // Neue Felder für Standard-Wochenplan
  default_daily_schedules: z.array(weeklyScheduleSchema).default([]),
  default_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  default_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
}).superRefine((data, ctx) => {
  if (data.contractType === 'fixed_term' && !data.contractEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enddatum ist für befristete Verträge erforderlich.",
      path: ["contractEndDate"],
    });
  }
  if (data.default_daily_schedules.length !== data.default_recurrence_interval_weeks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Die Anzahl der Wochenpläne muss dem Wiederholungsintervall (${data.default_recurrence_interval_weeks}) entsprechen.`,
      path: ["default_daily_schedules"],
    });
  }
});

export type EmployeeFormInput = z.input<typeof employeeSchema>;
export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormInput>;
  onSubmit: (data: EmployeeFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function EmployeeForm({ initialData, onSubmit, submitButtonText, onSuccess }: EmployeeFormProps) {
  const resolvedDefaultValues: EmployeeFormValues = {
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    email: initialData?.email ?? null,
    phone: initialData?.phone ?? null,
    hireDate: initialData?.hireDate ? new Date(initialData.hireDate) : null,
    status: initialData?.status ?? "active",
    contractType: initialData?.contractType ?? "full_time",
    contractEndDate: initialData?.contractEndDate ? new Date(initialData.contractEndDate) : null, // Initialwert für neues Feld
    hourlyRate: typeof initialData?.hourlyRate === 'number' ? initialData.hourlyRate : null,
    startDate: initialData?.startDate ? new Date(initialData.startDate) : null,
    jobTitle: initialData?.jobTitle ?? null,
    department: initialData?.department ?? null,
    notes: initialData?.notes ?? null,
    address: initialData?.address ?? null,
    dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
    socialSecurityNumber: initialData?.socialSecurityNumber ?? null,
    taxIdNumber: initialData?.taxIdNumber ?? null,
    healthInsuranceProvider: initialData?.healthInsuranceProvider ?? null,
    default_daily_schedules: (initialData?.default_daily_schedules as z.infer<typeof weeklyScheduleSchema>[]) ?? [],
    default_recurrence_interval_weeks: (initialData?.default_recurrence_interval_weeks as number | undefined) ?? 1,
    default_start_week_offset: (initialData?.default_start_week_offset as number | undefined) ?? 0,
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema as z.ZodSchema<EmployeeFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const { fields: defaultDailySchedulesFields, append: appendDefaultDailySchedule, remove: removeDefaultDailySchedule, replace: replaceDefaultDailySchedules } = useFieldArray({
    control: form.control,
    name: "default_daily_schedules",
  });

  const defaultRecurrenceIntervalWeeks = form.watch("default_recurrence_interval_weeks");
  const defaultStartWeekOffset = form.watch("default_start_week_offset");

  // Ensure default_daily_schedules array length matches default_recurrence_interval_weeks
  useEffect(() => {
    const currentLength = defaultDailySchedulesFields.length;
    if (currentLength < defaultRecurrenceIntervalWeeks) {
      for (let i = currentLength; i < defaultRecurrenceIntervalWeeks; i++) {
        appendDefaultDailySchedule({}); // Append empty weekly schedules
      }
    } else if (currentLength > defaultRecurrenceIntervalWeeks) {
      for (let i = currentLength - 1; i >= defaultRecurrenceIntervalWeeks; i--) {
        removeDefaultDailySchedule(i); // Remove excess weekly schedules
      }
    }
  }, [defaultRecurrenceIntervalWeeks, defaultDailySchedulesFields.length, appendDefaultDailySchedule, removeDefaultDailySchedule]);

  const handleFormSubmit: SubmitHandler<EmployeeFormValues> = async (data) => {
    const result = await onSubmit(data);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      if (!initialData) {
        form.reset();
        replaceDefaultDailySchedules([]); // Reset schedules after successful creation
      }
      onSuccess?.();
    }
  };

  const contractType = form.watch("contractType");

  const handleDailyHoursChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const parsedHours = value === "" ? null : Number(value);
    const currentSchedule = form.getValues(`default_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`default_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, hours: parsedHours }, { shouldValidate: true });

    const startTime = currentSchedule.start;
    if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(startTime, parsedHours), { shouldValidate: true });
    } else {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleDailyStartTimeChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`default_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`default_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, start: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleDailyEndTimeChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`default_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`default_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, end: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.start`, calculateStartTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`default_daily_schedules.${weekIndex}.${day}.start`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleCopyDayToAllWeeks = (sourceWeekIndex: number, sourceDay: typeof dayNames[number]) => {
    const sourceSchedule = form.getValues(`default_daily_schedules.${sourceWeekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    defaultDailySchedulesFields.forEach((_field: any, weekIndex: number) => {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`default_daily_schedules.${weekIndex}.${sourceDay}`, sourceSchedule, { shouldValidate: true });
        copiedCount++;
      }
    });
    if (copiedCount > 0) {
      toast.success(`Zeiten für ${germanDayNames[sourceDay]} wurden in ${copiedCount} weitere Wochen kopiert.`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  const handleCopyWeekToAllWeeks = (sourceWeekIndex: number) => {
    const sourceWeekSchedule = form.getValues(`default_daily_schedules.${sourceWeekIndex}`);
    if (!sourceWeekSchedule || Object.keys(sourceWeekSchedule).length === 0) {
      toast.info("Kein Wochenplan zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    defaultDailySchedulesFields.forEach((_field: any, weekIndex: number) => {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`default_daily_schedules.${weekIndex}`, sourceWeekSchedule, { shouldValidate: true });
        copiedCount++;
      }
    });
    if (copiedCount > 0) {
      toast.success(`Wochenplan von Woche ${sourceWeekIndex + 1} wurde in ${copiedCount} weitere Wochen kopiert.`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  const totalDefaultWeeklyHours = defaultDailySchedulesFields.reduce((totalSum: number, weekSchedule: any) => {
    return totalSum + dayNames.reduce((weekSum: number, day) => {
      const dailyHours = (weekSchedule as any)[day]?.hours;
      return weekSum + (dailyHours || 0);
    }, 0);
  }, 0);

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md mx-auto" suppressHydrationWarning>
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Z.B. Max"
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">Nachname</Label>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Z.B. Mustermann"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">E-Mail (optional)</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="Z.B. max.mustermann@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="phone">Telefon (optional)</Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder="Z.B. +49 123 456789"
        />
        {form.formState.errors.phone && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
        )}
      </div>
      <DatePicker
        label="Einstellungsdatum (optional)"
        value={form.watch("hireDate")}
        onChange={(date) => form.setValue("hireDate", date)}
        error={form.formState.errors.hireDate?.message}
      />
      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value) => form.setValue("status", value as "active" | "inactive" | "on_leave")} value={form.watch("status")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="inactive">Inaktiv</SelectItem>
            <SelectItem value="on_leave">Im Urlaub</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="contractType">Vertragsart</Label>
        <Select onValueChange={(value) => {
          form.setValue("contractType", value as "minijob" | "part_time" | "full_time" | "fixed_term");
          if (value !== "fixed_term") {
            form.setValue("contractEndDate", null); // Enddatum zurücksetzen, wenn nicht befristet
          }
        }} value={form.watch("contractType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Vertragsart auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minijob">Minijob</SelectItem>
            <SelectItem value="part_time">Teilzeit</SelectItem>
            <SelectItem value="full_time">Vollzeit</SelectItem>
            <SelectItem value="fixed_term">Befristet</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.contractType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.contractType.message}</p>
        )}
      </div>

      {contractType === "fixed_term" && (
        <DatePicker
          label="Vertragsenddatum"
          value={form.watch("contractEndDate")}
          onChange={(date) => form.setValue("contractEndDate", date)}
          error={form.formState.errors.contractEndDate?.message}
        />
      )}

      <div>
        <Label htmlFor="hourlyRate">Stundenlohn (optional)</Label>
        <Input
          id="hourlyRate"
          type="number"
          step="0.01"
          {...form.register("hourlyRate", { valueAsNumber: true })}
          placeholder="Z.B. 12.50"
        />
        {form.formState.errors.hourlyRate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.hourlyRate.message}</p>
        )}
      </div>
      <DatePicker
        label="Vertragsstart (optional)"
        value={form.watch("startDate")}
        onChange={(date) => form.setValue("startDate", date)}
        error={form.formState.errors.startDate?.message}
      />

      {/* Neue HR-Felder */}
      <div>
        <Label htmlFor="jobTitle">Berufsbezeichnung (optional)</Label>
        <Input
          id="jobTitle"
          {...form.register("jobTitle")}
          placeholder="Z.B. Reinigungskraft, Teamleiter"
        />
        {form.formState.errors.jobTitle && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.jobTitle.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="department">Abteilung (optional)</Label>
        <Input
          id="department"
          {...form.register("department")}
          placeholder="Z.B. Gebäudereinigung, Glasreinigung"
        />
        {form.formState.errors.department && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.department.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche HR-Notizen zum Mitarbeiter..."
          rows={3}
        />
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
        )}
      </div>

      {/* Neue persönliche Felder */}
      <div>
        <Label htmlFor="address">Adresse (optional)</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Z.B. Musterstraße 1, 12345 Musterstadt"
          rows={3}
        />
        {form.formState.errors.address && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
        )}
      </div>
      <DatePicker
        label="Geburtsdatum (optional)"
        value={form.watch("dateOfBirth")}
        onChange={(date) => form.setValue("dateOfBirth", date)}
        error={form.formState.errors.dateOfBirth?.message}
      />
      <div>
        <Label htmlFor="socialSecurityNumber">Sozialversicherungsnummer (optional)</Label>
        <Input
          id="socialSecurityNumber"
          {...form.register("socialSecurityNumber")}
          placeholder="Z.B. 12 345678 A 999"
        />
        {form.formState.errors.socialSecurityNumber && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.socialSecurityNumber.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="taxIdNumber">Steuer-ID (optional)</Label>
        <Input
          id="taxIdNumber"
          {...form.register("taxIdNumber")}
          placeholder="Z.B. 12 345 678 901"
        />
        {form.formState.errors.taxIdNumber && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.taxIdNumber.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="healthInsuranceProvider">Krankenkasse (optional)</Label>
        <Input
          id="healthInsuranceProvider"
          {...form.register("healthInsuranceProvider")}
          placeholder="Z.B. Techniker Krankenkasse"
        />
        {form.formState.errors.healthInsuranceProvider && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.healthInsuranceProvider.message}</p>
        )}
      </div>

      {/* Neue Felder für Standard-Wochenplan */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Standard-Wochenplan</h3>
        <p className="text-sm text-muted-foreground">
          Definieren Sie hier einen Standard-Wochenplan für diesen Mitarbeiter. Dieser kann bei der Auftragsplanung als Vorlage dienen.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="default_recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
            <Input
              id="default_recurrence_interval_weeks"
              type="number"
              step="1"
              min="1"
              max="52"
              {...form.register("default_recurrence_interval_weeks")}
              value={form.watch("default_recurrence_interval_weeks") ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                form.setValue("default_recurrence_interval_weeks", Number(value), { shouldValidate: true });
              }}
              placeholder="Z.B. 1 für jede Woche, 2 für jede zweite Woche"
            />
            {form.formState.errors.default_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{form.formState.errors.default_recurrence_interval_weeks.message}</p>}
          </div>
          <div>
            <Label htmlFor="default_start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
            <Input
              id="default_start_week_offset"
              type="number"
              step="1"
              min="0"
              max={defaultRecurrenceIntervalWeeks - 1}
              {...form.register("default_start_week_offset")}
              value={form.watch("default_start_week_offset") ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                form.setValue("default_start_week_offset", Number(value), { shouldValidate: true });
              }}
              placeholder="Z.B. 0 für die erste Woche, 1 für die zweite Woche"
            />
            {form.formState.errors.default_start_week_offset && <p className="text-red-500 text-sm mt-1">{form.formState.errors.default_start_week_offset.message}</p>}
          </div>
        </div>
        {form.formState.errors.default_daily_schedules && <p className="text-red-500 text-sm mt-1">{form.formState.errors.default_daily_schedules.message}</p>}
        {defaultDailySchedulesFields.map((weekSchedule, weekIndex: number) => (
          <div key={weekSchedule.id} className="border p-4 rounded-md space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base">Woche {weekIndex + 1} (Offset {(defaultStartWeekOffset + weekIndex) % defaultRecurrenceIntervalWeeks})</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => handleCopyWeekToAllWeeks(weekIndex)}
                      disabled={defaultRecurrenceIntervalWeeks === 1}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Diesen Wochenplan in alle anderen Wochen kopieren</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {dayNames.map(day => {
                const hoursFieldName = `default_daily_schedules.${weekIndex}.${day}.hours` as const;
                const startFieldName = `default_daily_schedules.${weekIndex}.${day}.start` as const;
                const endFieldName = `default_daily_schedules.${weekIndex}.${day}.end` as const;

                return (
                  <div key={day} className="border p-3 rounded-md space-y-2">
                    <h5 className="font-medium text-sm">{germanDayNames[day]}</h5>
                    <div>
                      <Label htmlFor={hoursFieldName} className="text-xs">Stunden (Netto)</Label>
                      <Input
                        id={hoursFieldName}
                        type="number"
                        step="0.01"
                        min="0"
                        max="24"
                        {...form.register(hoursFieldName)}
                        placeholder="Std."
                        value={form.watch(hoursFieldName) ?? ''}
                        onChange={(e) => handleDailyHoursChange(weekIndex, day, e.target.value)}
                      />
                      {(form.formState.errors as any)[hoursFieldName] && (
                        <p className="text-red-500 text-xs mt-1">{(form.formState.errors as any)[hoursFieldName]?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={startFieldName} className="text-xs">Startzeit</Label>
                      <Input
                        id={startFieldName}
                        type="time"
                        {...form.register(startFieldName)}
                        value={form.watch(startFieldName) ?? ''}
                        onChange={(e) => handleDailyStartTimeChange(weekIndex, day, e.target.value)}
                      />
                      {(form.formState.errors as any)[startFieldName] && (
                        <p className="text-red-500 text-xs mt-1">{(form.formState.errors as any)[startFieldName]?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={endFieldName} className="text-xs">Endzeit</Label>
                      <Input
                        id={endFieldName}
                        type="time"
                        {...form.register(endFieldName)}
                        value={form.watch(endFieldName) ?? ''}
                        onChange={(e) => handleDailyEndTimeChange(weekIndex, day, e.target.value)}
                      />
                      {(form.formState.errors as any)[endFieldName] && (
                        <p className="text-red-500 text-xs mt-1">{(form.formState.errors as any)[endFieldName]?.message}</p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => handleCopyDayToAllWeeks(weekIndex, day)}
                            disabled={defaultRecurrenceIntervalWeeks === 1 || (!form.watch(hoursFieldName) && !form.watch(startFieldName) && !form.watch(endFieldName))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zeiten für diesen Tag in alle anderen Wochen kopieren</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-4 text-base font-semibold">
          Geschätzte Wochenstunden (Netto, über alle Wochen): {totalDefaultWeeklyHours.toFixed(2)}
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}