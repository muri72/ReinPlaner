"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trackFormError, addBreadcrumb } from "@/lib/sentry";
import { useFormUnsavedChangesForCreate } from "@/components/ui/unsaved-changes-context";
import { settingsService } from "@/lib/services/settings-service";
import { Card, CardContent } from "@/components/ui/card";
import { FormActions } from "@/components/ui/form-actions";
import {
  preprocessNumber,
  dayNames,
} from "@/lib/utils/form-utils";
import { calculateVacationDays, getDaysPerWeekFromSchedule } from "@/lib/lohngruppen-config";
import {
  EmployeeBasicInfoSection,
  EmployeeDatesSection,
  EmployeeEmploymentSection,
  EmployeeScheduleSection,
  EmployeeVacationSection,
  EmployeeWageSection,
} from "./employee-form/index";

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
  default_daily_schedules: z.array(z.any()),
  default_recurrence_interval_weeks: z.coerce.number().min(1).max(52),
  default_start_week_offset: z.coerce.number().min(0).max(51),
  working_days_per_week: z.coerce.number().min(1).max(7).default(5),
  contract_hours_per_week: z.preprocess(preprocessNumber, z.number().min(0).max(60).nullable().optional()),
  vacation_balance: z.preprocess(preprocessNumber, z.number().min(0).nullable().optional()),
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

  // Build default values
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

    const result = {
      ...baseDefaults,
      ...processedInitialData,
      can_work_holidays: (processedInitialData as any)?.can_work_holidays ?? false,
    };

    if (!result.default_daily_schedules ||
        !Array.isArray(result.default_daily_schedules) ||
        result.default_daily_schedules.length === 0) {
      result.default_daily_schedules = [{}];
    }

    return result;
  };

  const form = useForm<EmployeeFormInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: buildDefaultValues(),
    mode: "onChange",
  });

  // Register with unsaved changes context
  useFormUnsavedChangesForCreate("employee-form", form.formState.isDirty, isCreateMode);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset(buildDefaultValues());
    }
  }, [initialData, form]);

  // Reset form dirty state after initial setup for create mode
  useEffect(() => {
    if (isCreateMode) {
      const timer = setTimeout(() => {
        form.reset(form.getValues(), { keepValues: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCreateMode, form]);

  const handleFormSubmit: SubmitHandler<EmployeeFormInput> = async (data) => {
    setIsSubmitting(true);

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
        addBreadcrumb('Employee form server error', 'form', 'error', {
          message: result.message,
        });
        toast.error(result.message);
      }
    } catch (error) {
      trackFormError(
        error as Error,
        'employee-form',
        { ...data, mode: isCreateMode ? 'create' : 'edit' }
      );
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !isSubmitting) {
      onSuccess?.();
    } else {
      onSuccess?.();
    }
  };

  // Schedule state management
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

    const subscription = form.watch((value, { name, type }) => {
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
  useEffect(() => {
    const schedules = form.getValues('default_daily_schedules');
    const daysPerWeek = getDaysPerWeekFromSchedule(schedules);

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

    const currentWorkingDays = form.getValues("working_days_per_week");
    const currentContractHours = form.getValues("contract_hours_per_week");

    if (daysPerWeek > 0 && currentWorkingDays !== daysPerWeek) {
      form.setValue("working_days_per_week", daysPerWeek, { shouldDirty: false });
    }
    if (totalHours > 0 && currentContractHours !== totalHours) {
      form.setValue("contract_hours_per_week", totalHours, { shouldDirty: false });
    }

    const calculatedVacationDaysCalc = calculateVacationDays(baseVacationDays, daysPerWeek, contractType).tage;
    const currentVacation = form.getValues("vacation_balance");
    const currentVacationNum = currentVacation ? Number(currentVacation) : 0;
    const isDefaultVacation = !currentVacation || currentVacation === null ||
      currentVacation === undefined || currentVacation === 0 ||
      currentVacation === 26 || currentVacation === 30;

    if (totalHours > 0 && (isDefaultVacation || currentVacationNum !== calculatedVacationDaysCalc)) {
      form.setValue("vacation_balance", calculatedVacationDaysCalc, { shouldDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleVersion, baseVacationDays]);

  // Auto-update vacation_balance when contract_type changes
  useEffect(() => {
    const schedules = form.getValues('default_daily_schedules');
    const daysPerWeek = getDaysPerWeekFromSchedule(schedules);
    const contractType = (form.watch("contract_type") as string) || "full_time";

    if (daysPerWeek > 0) {
      const calculatedVacationDays = calculateVacationDays(baseVacationDays, daysPerWeek, contractType).tage;
      const currentVacation = form.getValues("vacation_balance");
      const currentVacationNum = currentVacation ? Number(currentVacation) : 0;

      if (currentVacationNum !== calculatedVacationDays) {
        form.setValue("vacation_balance", calculatedVacationDays, { shouldDirty: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("contract_type"), scheduleVersion, baseVacationDays, form]);

  return (
    <>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <EmployeeBasicInfoSection form={form} />
        <EmployeeDatesSection form={form} />
        <EmployeeEmploymentSection form={form} />
        <EmployeeScheduleSection 
          form={form} 
          totalWeeklyHours={totalWeeklyHours}
          scheduleVersion={scheduleVersion}
        />
        <EmployeeVacationSection form={form} />
        <EmployeeWageSection form={form} />

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