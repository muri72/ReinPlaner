"use client";

import { useForm, SubmitHandler, FieldPath, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, X, Clock, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createObject } from "@/app/dashboard/objects/actions";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { MultiSelectEmployees } from "@/components/multi-select-employees";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

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
  start: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  end: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
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

const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_daily_schedules: z.array(weeklyScheduleSchema).default([]),
  assigned_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  assigned_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
});

export type AssignedEmployee = z.infer<typeof assignedEmployeeSchema>;

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  timeOfDay: z.enum(["any", "morning", "noon", "afternoon"]).default("any"),
  accessMethod: z.enum(["key", "card", "code", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
  isAlarmSecured: z.boolean().default(false),
  alarmPassword: z.string().max(50, "Alarmkennwort ist zu lang").optional().nullable(),
  securityCodeWord: z.string().max(50, "Sicherheitscodewort ist zu lang").optional().nullable(),
  daily_schedules: z.array(weeklyScheduleSchema).default([]),
  recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
}).superRefine((data, ctx) => {
  if (data.isAlarmSecured && !data.alarmPassword && !data.securityCodeWord) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Alarmkennwort oder Sicherheitscodewort ist erforderlich, wenn alarmgesichert.",
      path: ["alarmPassword"],
    });
  }
  if (data.daily_schedules.length !== data.recurrence_interval_weeks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Die Anzahl der Wochenpläne muss dem Wiederholungsintervall (${data.recurrence_interval_weeks}) entsprechen.`,
      path: ["daily_schedules"],
    });
  }
});

export type ObjectFormInput = z.input<typeof objectSchema>;
export type ObjectFormValues = z.infer<typeof objectSchema>;

interface ObjectFormProps {
  initialData?: Partial<ObjectFormInput>;
  onSubmit: (data: ObjectFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function ObjectForm({ initialData, onSubmit, submitButtonText, onSuccess }: ObjectFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<any[]>([]); // Keep as any[] for now, detailed type not needed here
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [isNewObjectDialogOpen, setIsNewObjectDialogOpen] = useState(false);

  const resolvedDefaultValues: ObjectFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? null,
    customerId: initialData?.customerId ?? "",
    customerContactId: initialData?.customerContactId ?? null,
    notes: initialData?.notes ?? null,
    priority: initialData?.priority ?? "medium",
    timeOfDay: initialData?.timeOfDay ?? "any",
    accessMethod: initialData?.accessMethod ?? "key",
    pin: initialData?.pin ?? null,
    isAlarmSecured: initialData?.isAlarmSecured ?? false,
    alarmPassword: initialData?.alarmPassword ?? null,
    securityCodeWord: initialData?.securityCodeWord ?? null,
    daily_schedules: (initialData?.daily_schedules as z.infer<typeof weeklyScheduleSchema>[]) ?? [],
    recurrence_interval_weeks: (initialData?.recurrence_interval_weeks as number | undefined) ?? 1,
    start_week_offset: (initialData?.start_week_offset as number | undefined) ?? 0,
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const { fields: dailySchedulesFields, append: appendDailySchedule, remove: removeDailySchedule, replace: replaceDailySchedules } = useFieldArray({
    control: form.control,
    name: "daily_schedules",
  });

  const selectedCustomerId = form.watch("customerId");
  const recurrenceIntervalWeeks = form.watch("recurrence_interval_weeks");
  const startWeekOffset = form.watch("start_week_offset");

  // Ensure daily_schedules array length matches recurrence_interval_weeks
  useEffect(() => {
    const currentLength = dailySchedulesFields.length;
    if (currentLength < recurrenceIntervalWeeks) {
      for (let i = currentLength; i < recurrenceIntervalWeeks; i++) {
        appendDailySchedule({}); // Append empty weekly schedules
      }
    } else if (currentLength > recurrenceIntervalWeeks) {
      for (let i = currentLength - 1; i >= recurrenceIntervalWeeks; i--) {
        removeDailySchedule(i); // Remove excess weekly schedules
      }
    }
  }, [recurrenceIntervalWeeks, dailySchedulesFields.length, appendDailySchedule, removeDailySchedule]);

  const fetchCustomerContacts = async (customerId: string) => {
    const { data: contactsData, error: contactsError } = await supabase
      .from('customer_contacts')
      .select('id, first_name, last_name, customer_id')
      .eq('customer_id', customerId)
      .order('last_name', { ascending: true });
    if (contactsData) setCustomerContacts(contactsData);
    if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name');
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      // Fetch objects to populate dropdowns if needed, but not for initial data
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, recurrence_interval_weeks, start_week_offset, daily_schedules');
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);
    };
    fetchDropdownData();
  }, [supabase]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  // Calculate total weekly hours for display (sum of all weeks in the recurrence cycle)
  const totalWeeklyHours = dailySchedulesFields.reduce((totalSum: number, weekSchedule: any) => {
    return totalSum + dayNames.reduce((weekSum: number, day) => {
      const dailyHours = (weekSchedule as any)[day]?.hours;
      return weekSum + (dailyHours || 0);
    }, 0);
  }, 0);

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    const result = await onSubmit(data);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
        replaceDailySchedules([]); // Reset schedules after successful creation
      }
      onSuccess?.();
    }
  };

  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId);
      form.setValue("customerContactId", newContactId);
    }
  };

  const handleDailyHoursChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const parsedHours = value === "" ? null : Number(value);
    const currentSchedule = form.getValues(`daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, hours: parsedHours }, { shouldValidate: true });

    const startTime = currentSchedule.start;
    if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
      form.setValue(`daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(startTime, parsedHours), { shouldValidate: true });
    } else {
      form.setValue(`daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleDailyStartTimeChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, start: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleDailyEndTimeChange = useCallback((
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, end: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`daily_schedules.${weekIndex}.${day}.start`, calculateStartTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`daily_schedules.${weekIndex}.${day}.start`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleCopyDayToAllWeeks = (sourceWeekIndex: number, sourceDay: typeof dayNames[number]) => {
    const sourceSchedule = form.getValues(`daily_schedules.${sourceWeekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    dailySchedulesFields.forEach((_field: any, weekIndex: number) => {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`daily_schedules.${weekIndex}.${sourceDay}`, sourceSchedule, { shouldValidate: true });
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
    const sourceWeekSchedule = form.getValues(`daily_schedules.${sourceWeekIndex}`);
    if (!sourceWeekSchedule || Object.keys(sourceWeekSchedule).length === 0) {
      toast.info("Kein Wochenplan zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    dailySchedulesFields.forEach((_field: any, weekIndex: number) => {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`daily_schedules.${weekIndex}`, sourceWeekSchedule, { shouldValidate: true });
        copiedCount++;
      }
    });
    if (copiedCount > 0) {
      toast.success(`Wochenplan von Woche ${sourceWeekIndex + 1} wurde in ${copiedCount} weitere Wochen kopiert.`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
      <div>
        <Label htmlFor="name">Objektname</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Z.B. Hauptgebäude"
        />
        {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Z.B. Musterstraße 1, 12345 Musterstadt"
          rows={3}
        />
        {form.formState.errors.address && <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Zusätzliche Details zum Objekt..."
          rows={3}
        />
        {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>}
      </div>
      <div>
        <Label htmlFor="customerId">Zugehöriger Kunde</Label>
        <Select onValueChange={(value) => {
          form.setValue("customerId", value);
          form.setValue("customerContactId", null); // Reset contact when customer changes
        }} value={form.watch("customerId")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="customerContactId">Objektleiter (Kundenkontakt, optional)</Label>
          <Select onValueChange={(value) => form.setValue("customerContactId", value === "unassigned" ? null : value)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kundenkontakt auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Objektleiter zugewiesen</SelectItem>
              {customerContacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.customerContactId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>}
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>
      <div>
        <Label htmlFor="notes">Interne Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Interne Notizen zum Objekt (z.B. Besonderheiten, Gefahren)..."
          rows={3}
        />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="priority">Priorität</Label>
          <Select onValueChange={(value) => form.setValue("priority", value as ObjectFormValues["priority"])} value={form.watch("priority")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priorität auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Niedrig</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.priority && <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>}
        </div>
        <div>
          <Label htmlFor="timeOfDay">Bevorzugte Tageszeit</Label>
          <Select onValueChange={(value) => form.setValue("timeOfDay", value as ObjectFormValues["timeOfDay"])} value={form.watch("timeOfDay")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tageszeit auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Beliebig</SelectItem>
              <SelectItem value="morning">Vormittags</SelectItem>
              <SelectItem value="noon">Mittags</SelectItem>
              <SelectItem value="afternoon">Nachmittags</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.timeOfDay && <p className="text-red-500 text-sm mt-1">{form.formState.errors.timeOfDay.message}</p>}
        </div>
        <div>
          <Label htmlFor="accessMethod">Zugangsmethode</Label>
          <Select onValueChange={(value) => form.setValue("accessMethod", value as ObjectFormValues["accessMethod"])} value={form.watch("accessMethod")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Methode auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key">Schlüssel</SelectItem>
              <SelectItem value="card">Zutrittskarte</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="other">Andere</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.accessMethod && <p className="text-red-500 text-sm mt-1">{form.formState.errors.accessMethod.message}</p>}
        </div>
      </div>
      {form.watch("accessMethod") === "code" && (
        <div>
          <Label htmlFor="pin">PIN / Zugangscode</Label>
          <Input
            id="pin"
            {...form.register("pin")}
            placeholder="Z.B. 1234"
          />
          {form.formState.errors.pin && <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>}
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Controller
          control={form.control}
          name="isAlarmSecured"
          render={({ field }) => (
            <Checkbox
              id="isAlarmSecured"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isAlarmSecured">Objekt ist alarmgesichert</Label>
      </div>
      {form.watch("isAlarmSecured") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="alarmPassword">Alarmkennwort (optional)</Label>
            <Input
              id="alarmPassword"
              {...form.register("alarmPassword")}
              placeholder="Z.B. 5678"
            />
            {form.formState.errors.alarmPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.alarmPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="securityCodeWord">Sicherheitscodewort (optional)</Label>
            <Input
              id="securityCodeWord"
              {...form.register("securityCodeWord")}
              placeholder="Z.B. 'Sonne'"
            />
            {form.formState.errors.securityCodeWord && <p className="text-red-500 text-sm mt-1">{form.formState.errors.securityCodeWord.message}</p>}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Wiederholungsintervall</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
            <Input
              id="recurrence_interval_weeks"
              type="number"
              step="1"
              min="1"
              max="52"
              {...form.register("recurrence_interval_weeks", { valueAsNumber: true })}
              placeholder="Z.B. 1 für jede Woche, 2 für jede zweite Woche"
            />
            {form.formState.errors.recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{form.formState.errors.recurrence_interval_weeks.message}</p>}
          </div>
          <div>
            <Label htmlFor="start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
            <Input
              id="start_week_offset"
              type="number"
              step="1"
              min="0"
              max={recurrenceIntervalWeeks - 1}
              {...form.register("start_week_offset", { valueAsNumber: true })}
              placeholder="Z.B. 0 für die erste Woche, 1 für die zweite Woche"
            />
            {form.formState.errors.start_week_offset && <p className="text-red-500 text-sm mt-1">{form.formState.errors.start_week_offset.message}</p>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten gelten.
          Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Regelmäßige Arbeitszeiten pro Wochentag</h3>
        {form.formState.errors.daily_schedules && <p className="text-red-500 text-sm mt-1">{form.formState.errors.daily_schedules.message}</p>}
        {dailySchedulesFields.map((weekSchedule, weekIndex: number) => (
          <div key={weekSchedule.id} className="border p-4 rounded-md space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base">Woche {weekIndex + 1} (Offset {(startWeekOffset + weekIndex) % recurrenceIntervalWeeks})</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => handleCopyWeekToAllWeeks(weekIndex)}
                      disabled={recurrenceIntervalWeeks === 1}
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
                const hoursFieldName = `daily_schedules.${weekIndex}.${day}.hours` as const;
                const startFieldName = `daily_schedules.${weekIndex}.${day}.start` as const;
                const endFieldName = `daily_schedules.${weekIndex}.${day}.end` as const;

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
                        {...form.register(hoursFieldName, { valueAsNumber: true })}
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
                            disabled={recurrenceIntervalWeeks === 1 || (!form.watch(hoursFieldName) && !form.watch(startFieldName) && !form.watch(endFieldName))}
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
          Geschätzte Wochenstunden (Netto, über alle Wochen): {totalWeeklyHours.toFixed(2)}
        </div>
      </div>
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}