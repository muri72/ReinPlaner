"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trackFormError, addBreadcrumb } from "@/lib/sentry";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMemo, useState, useEffect } from "react";
import { DatePicker } from "@/components/date-picker";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { FormActions } from "@/components/ui/form-actions";
import { useFormUnsavedChanges, useFormUnsavedChangesForCreate } from "@/components/ui/unsaved-changes-context";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "@/lib/services/settings-service";
import {
  preprocessNumber,
  timeRegex,
  dayNames,
  germanDayNames,
  dailyScheduleSchema,
  weeklyScheduleSchema,
} from "@/lib/utils/form-utils";
import { lohngruppen, getLohngruppenOptions, psaZuschlaege, calculateVacationDays, getDaysPerWeekFromSchedule } from "@/lib/lohngruppen-config";

export const employeeSchema = z.object({
  first_name: z.string().min(1, "Vorname ist erforderlich"),
  last_name: z.string().min(1, "Nachname ist erforderlich"),
  email: z.union([
    z.string().email("Ungültige E-Mail-Adresse"),
    z.literal("")
  ]).transform(e => e === "" ? null : e).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  date_of_birth: z.date().optional().nullable(),
  hire_date: z.date().optional().nullable(),
  start_date: z.date().optional().nullable(),
  contract_end_date: z.date().optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]),
  contract_type: z.enum(["full_time", "part_time", "minijob", "freelancer"]).nullable().optional(),
  hourly_rate: z.preprocess(preprocessNumber, z.number().min(0).nullable().optional()),
  job_title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  social_security_number: z.string().nullable().optional(),
  tax_id_number: z.string().nullable().optional(),
  health_insurance_provider: z.string().nullable().optional(),
  can_work_holidays: z.boolean(),
  default_daily_schedules: z.array(weeklyScheduleSchema),
  default_recurrence_interval_weeks: z.coerce.number().min(1).max(52),
  default_start_week_offset: z.coerce.number().min(0).max(51),
  // Vacation & Work settings
  working_days_per_week: z.coerce.number().min(1).max(7).default(5),
  contract_hours_per_week: z.preprocess(preprocessNumber, z.number().min(0).max(60).nullable().optional()),
  vacation_balance: z.preprocess(preprocessNumber, z.number().min(0).nullable().optional()),
  // Lohngruppen settings (TV GD 2026)
  wage_group: z.coerce.number().min(1).max(9).nullable().optional(),
  qualification: z.string().nullable().optional(),
  has_professional_education: z.boolean().default(false),
  lohngruppen_eingruppung_datum: z.date().nullable().optional(),
  psa_type: z.string().nullable().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
export type EmployeeFormInput = z.input<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormValues>;
  onSubmit: (data: EmployeeFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isInDialog?: boolean;
  isCreateMode?: boolean;
}

// Helper component for labels with required asterisk
function LabelWithRequired({ htmlFor, children, required, className }: { htmlFor: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium",
        required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        className
      )}
    >
      {children}
    </Label>
  );
}

// Helper function to convert string dates to Date objects
const convertStringToDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Helper component for vacation calculation display
function VacationCalculationDisplay({
  calculatedHours,
  contractType,
  baseVacationDays,
  calculatedDaysPerWeek,
  calculatedVacationDays,
}: {
  calculatedHours: number;
  contractType: string;
  baseVacationDays: number;
  calculatedDaysPerWeek: number;
  calculatedVacationDays: number;
}) {
  const isMinijob = contractType === "minijob";

  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-muted-foreground">Aus Schedule:</span>
          <span className="ml-2 font-medium">{calculatedHours.toFixed(2)} Std./Woche</span>
        </div>
        <div>
          <span className="text-muted-foreground">Arbeitstage/Woche:</span>
          <span className="ml-2 font-medium">{calculatedDaysPerWeek} Tage</span>
        </div>
      </div>
      <div>
        <span className="text-muted-foreground">Basis-Urlaubstage:</span>
        <span className="ml-2 font-medium">{baseVacationDays} Tage</span>
      </div>
      <div className="pt-2 border-t">
        <span className="text-muted-foreground">Berechneter Urlaubsanspruch:</span>
        <span className="ml-2 font-semibold text-primary">
          {calculatedVacationDays} Tage
          {isMinijob && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              (proportional)
            </span>
          )}
        </span>
      </div>
      {isMinijob && calculatedDaysPerWeek > 0 && (
        <p className="text-xs text-muted-foreground">
          Berechnung: {baseVacationDays} × {calculatedDaysPerWeek}/5 = {calculatedVacationDays} Tage
        </p>
      )}
      {!isMinijob && (
        <p className="text-xs text-muted-foreground">
          Vollanspruch: {baseVacationDays} Tage (keine proportionale Kürzung)
        </p>
      )}
    </div>
  );
}

export function EmployeeForm({ initialData, onSubmit, submitButtonText, onSuccess, isInDialog = false, isCreateMode = false }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert string dates to Date objects for the form
  const processedInitialData = initialData ? {
    ...initialData,
    date_of_birth: convertStringToDate(initialData.date_of_birth as any),
    hire_date: convertStringToDate(initialData.hire_date as any),
    start_date: convertStringToDate(initialData.start_date as any),
    contract_end_date: convertStringToDate(initialData.contract_end_date as any),
  } : {};

  // Build default values - merge base defaults with initialData (if provided)
  const buildDefaultValues = () => {
    const baseDefaults = {
      first_name: "",
      last_name: "",
      status: "active" as const,
      contract_type: undefined as undefined,
      default_daily_schedules: [{}],
      default_recurrence_interval_weeks: 1,
      default_start_week_offset: 0,
      can_work_holidays: false,
    };

    if (!initialData) {
      return baseDefaults;
    }

    // For edit mode, use initialData values to avoid uncontrolled→controlled switch
    return {
      ...baseDefaults,
      ...processedInitialData,
      can_work_holidays: (processedInitialData as any)?.can_work_holidays ?? false,
    };
  };

  const form = useForm<EmployeeFormInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: buildDefaultValues(),
    mode: "onChange",
  });

  // Register with unsaved changes context
  // Use special hook for create forms to avoid false positives from prefills
  useFormUnsavedChangesForCreate("employee-form", form.formState.isDirty, isCreateMode);

  // Reset form dirty state after initial setup for create mode
  useEffect(() => {
    if (isCreateMode) {
      // Wait for all initial manipulations to complete, then reset dirty state
      const timer = setTimeout(() => {
        form.reset(form.getValues(), { keepValues: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCreateMode, form]);

  const handleFormSubmit: SubmitHandler<EmployeeFormInput> = async (data) => {
    setIsSubmitting(true);

    // Add breadcrumb for form submission start
    addBreadcrumb('Employee form submission started', 'form', 'info', {
      hasFirstName: !!data.first_name,
      hasLastName: !!data.last_name,
      contractType: data.contract_type,
      mode: isCreateMode ? 'create' : 'edit',
    });

    try {
      const result = await onSubmit(data as EmployeeFormValues);

      if (result.success) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        // Add breadcrumb for server error
        addBreadcrumb('Employee form server error', 'form', 'error', {
          message: result.message,
        });

        toast.error(result.message);
      }
    } catch (error) {
      // Send to Sentry with form context
      trackFormError(
        error as Error,
        'employee-form',
        {
          ...data,
          mode: isCreateMode ? 'create' : 'edit',
        }
      );

      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper function to call handleFormSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !isSubmitting) {
      // Show confirmation - dialog protection will handle this
      onSuccess?.();
    } else {
      onSuccess?.();
    }
  };

  // Calculate total weekly hours from schedule
  // Force re-render when schedule changes
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [baseVacationDays, setBaseVacationDays] = useState(26);

  // Load base vacation days from settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const baseDays = await settingsService.getSetting('base_vacation_days');
        if (baseDays && !isNaN(Number(baseDays))) {
          setBaseVacationDays(Number(baseDays));
        }
      } catch (error) {
        console.error('Error loading base vacation days:', error);
      }
    }
    loadSettings();

    // Only watch schedule changes, not all form changes
    // This prevents infinite loop when we auto-populate other fields
    const subscription = form.watch((value, { name, type }) => {
      // Check if the changed field is within the schedule structure
      // This catches both direct changes to default_daily_schedules AND nested field changes
      // like default_daily_schedules.0.monday.hours
      if (name && (name === 'default_daily_schedules' || name.startsWith('default_daily_schedules.')) && type === 'change') {
        setScheduleVersion(v => v + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Calculate total weekly hours from schedule
  const totalWeeklyHours = useMemo(() => {
    const schedules = form.getValues('default_daily_schedules');
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
      // Handle both number and string inputs
      const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
      return acc + (typeof numHours === 'number' && !isNaN(numHours) ? numHours : 0);
    }, 0);
    return total.toFixed(2);
  }, [form, scheduleVersion]);

  // Calculate derived values from schedule
  const schedules = form.getValues('default_daily_schedules');
  const calculatedHours = parseFloat(totalWeeklyHours);
  const calculatedDaysPerWeek = getDaysPerWeekFromSchedule(schedules);
  const contractType = (form.watch("contract_type") as string) || "full_time";
  const calculatedVacationDays = calculateVacationDays(baseVacationDays, calculatedDaysPerWeek, contractType).tage;

  // Auto-populate fields from schedule
  // Always update working_days_per_week and contract_hours_per_week based on schedule
  useEffect(() => {
    const schedules = form.getValues('default_daily_schedules');
    const daysPerWeek = getDaysPerWeekFromSchedule(schedules);

    // Calculate total hours from schedule
    let totalHours = 0;
    if (schedules && schedules.length > 0 && schedules[0]) {
      const firstWeekSchedule = schedules[0];
      const dayValues = Object.values(firstWeekSchedule);
      if (dayValues && dayValues.length > 0) {
        totalHours = dayValues.reduce((acc: number, day: any) => {
          const hours = day?.hours;
          const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
          return acc + (typeof numHours === 'number' && !isNaN(numHours) ? numHours : 0);
        }, 0);
      }
    }

    // Always update these fields based on the schedule (they are derived values)
    // Use a flag to prevent unnecessary updates
    const currentWorkingDays = form.getValues("working_days_per_week");
    const currentContractHours = form.getValues("contract_hours_per_week");

    if (daysPerWeek > 0 && currentWorkingDays !== daysPerWeek) {
      form.setValue("working_days_per_week", daysPerWeek, { shouldDirty: false });
    }
    if (totalHours > 0 && currentContractHours !== totalHours) {
      form.setValue("contract_hours_per_week", totalHours, { shouldDirty: false });
    }

    // Auto-populate vacation_balance based on contract type and working days
    const contractType = (form.watch("contract_type") as string) || "full_time";
    const calculatedVacationDays = calculateVacationDays(baseVacationDays, daysPerWeek, contractType).tage;
    const currentVacation = form.getValues("vacation_balance");
    const currentVacationNum = currentVacation ? Number(currentVacation) : 0;
    const isDefaultVacation = !currentVacation || currentVacation === null ||
      currentVacation === undefined || currentVacation === 0 ||
      currentVacation === 26 || currentVacation === 30;

    if (totalHours > 0 && (isDefaultVacation || currentVacationNum !== calculatedVacationDays)) {
      form.setValue("vacation_balance", calculatedVacationDays, { shouldDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleVersion, baseVacationDays]); // Removed 'form' from deps to prevent infinite loop

  return (
    <>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <LabelWithRequired htmlFor="first_name" required>Vorname</LabelWithRequired>
          <Input id="first_name" {...form.register("first_name")} />
          {form.formState.errors.first_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.first_name.message}</p>}
        </div>
        <div>
          <LabelWithRequired htmlFor="last_name" required>Nachname</LabelWithRequired>
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
                {...form.register(`default_daily_schedules.0.${day}.hours`)}
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
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="on_leave">Beurlaubt</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="contract_type">Vertragsart</Label>
          <Controller
            name="contract_type"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(value || undefined);
                }}
                value={field.value ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vertragsart auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Vollzeit</SelectItem>
                  <SelectItem value="part_time">Teilzeit</SelectItem>
                  <SelectItem value="minijob">Minijob</SelectItem>
                  <SelectItem value="freelancer">Freiberufler</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="hourly_rate">Stundensatz (€)</Label>
        <Input id="hourly_rate" type="number" step="0.01" {...form.register("hourly_rate")} />
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

      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="can_work_holidays" className="text-sm font-medium">
          Bereit für Feiertagsarbeit
        </Label>
        <Controller
          name="can_work_holidays"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="can_work_holidays"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>

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

      {/* Lohngruppe Section (TV GD 2026) */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Lohngruppe & Vergütung (TV GD 2026)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tarifliche Eingruppierung gemäß Tarifvertrag für die Gebäudereinigung 2026
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="wage_group">Lohngruppe</Label>
            <Controller
              name="wage_group"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lohngruppe auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {getLohngruppenOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.wage_group && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.wage_group.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lohngruppen_eingruppung_datum">Datum der Eingruppierung</Label>
            <Controller
              name="lohngruppen_eingruppung_datum"
              control={form.control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="qualification">Qualifikationsnachweis</Label>
            <Input
              id="qualification"
              {...form.register("qualification")}
              placeholder="z.B. Desinfektor, Schädlingsbekämpfer"
            />
            <p className="text-xs text-muted-foreground mt-1">Besondere Qualifikationen dokumentieren</p>
          </div>

          <div>
            <Label htmlFor="psa_type">Persönliche Schutzausrüstung (PSA)</Label>
            <Controller
              name="psa_type"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value || undefined)}
                  value={field.value !== null ? field.value : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PSA-Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {psaZuschlaege.map((psa) => (
                      <SelectItem key={psa.id} value={psa.id}>
                        {psa.bezeichnung} {psa.zuschlagProzent > 0 ? `(+${psa.zuschlagProzent}%)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">Zutreffende PSA-Kategorie auswählen</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Controller
            name="has_professional_education"
            control={form.control}
            render={({ field }) => (
              <Switch
                id="has_professional_education"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="has_professional_education" className="text-sm font-medium">
            3-jährige Berufsausbildung zum Gebäudereiniger absolviert
          </Label>
        </div>

        {/* Vacation Calculation Display for Minijobs */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Urlaubsberechnung (aus Standard-Wochenstunden)</h4>
          <VacationCalculationDisplay
            calculatedHours={calculatedHours}
            contractType={contractType}
            baseVacationDays={baseVacationDays}
            calculatedDaysPerWeek={calculatedDaysPerWeek}
            calculatedVacationDays={calculatedVacationDays}
          />
        </div>
      </div>

        <FormActions
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onSubmit={handleSubmitClick}
          submitLabel={submitButtonText}
          cancelLabel="Abbrechen"
          showCancel={!isInDialog}
          submitVariant="default"
          loadingText={`${submitButtonText}...`}
        />
      </form>
    </>
  );
}