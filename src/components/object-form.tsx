"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react"; // Import useCallback
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility
import { calculateEndTime } from "@/lib/utils"; // Import the new utility

const preprocessNumber = (val: any) => (val === "" || isNaN(Number(val)) ? null : Number(val));
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Helper function for time validation
const validateTimePair = (start: string | null | undefined, end: string | null | undefined, ctx: z.RefinementCtx, pathPrefix: string) => {
  if (start && !end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Endzeit ist erforderlich, wenn Startzeit angegeben ist.",
      path: [`${pathPrefix}_end_time`],
    });
  } else if (!start && end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Startzeit ist erforderlich, wenn Endzeit angegeben ist.",
      path: [`${pathPrefix}_start_time`],
    });
  } else if (start && end) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const startTimeInMinutes = startH * 60 + startM;
    let endTimeInMinutes = endH * 60 + endM;

    // Handle times spanning midnight
    if (endTimeInMinutes < startTimeInMinutes) {
      endTimeInMinutes += 24 * 60; // Add 24 hours for the next day
    }

    if (endTimeInMinutes <= startTimeInMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Endzeit muss nach der Startzeit liegen.",
        path: [`${pathPrefix}_end_time`],
      });
    }
  }
};

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  customerContactId: z.string().uuid("Ungültige Kontakt-ID").optional().nullable(),
  
  monday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  tuesday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  wednesday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  thursday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  friday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  saturday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),
  sunday_hours: z.preprocess(preprocessNumber, z.number().min(0).max(24).optional().nullable()),

  monday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  monday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  tuesday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  tuesday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  wednesday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  wednesday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  thursday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  thursday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  friday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  friday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  saturday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  saturday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  sunday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  sunday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),

  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("low"),
  timeOfDay: z.enum(["morning", "noon", "afternoon", "any"]).default("any"),
  accessMethod: z.enum(["key", "card", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
  isAlarmSecured: z.boolean().default(false),
  alarmPassword: z.string().max(50, "Alarmkennwort ist zu lang").optional().nullable(),
  securityCodeWord: z.string().max(50, "Codewort ist zu lang").optional().nullable(),
}).superRefine((data, ctx) => {
  // Validate each day's time pair
  validateTimePair(data.monday_start_time, data.monday_end_time, ctx, 'monday');
  validateTimePair(data.tuesday_start_time, data.tuesday_end_time, ctx, 'tuesday');
  validateTimePair(data.wednesday_start_time, data.wednesday_end_time, ctx, 'wednesday');
  validateTimePair(data.thursday_start_time, data.thursday_end_time, ctx, 'thursday');
  validateTimePair(data.friday_start_time, data.friday_end_time, ctx, 'friday');
  validateTimePair(data.saturday_start_time, data.saturday_end_time, ctx, 'saturday');
  validateTimePair(data.sunday_start_time, data.sunday_end_time, ctx, 'sunday');
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
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const germanDayNames: { [key: string]: string } = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
  };

  const resolvedDefaultValues: ObjectFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? null,
    customerId: initialData?.customerId ?? "",
    customerContactId: initialData?.customerContactId ?? null,
    monday_hours: (initialData?.monday_hours as number) ?? null,
    tuesday_hours: (initialData?.tuesday_hours as number) ?? null,
    wednesday_hours: (initialData?.wednesday_hours as number) ?? null,
    thursday_hours: (initialData?.thursday_hours as number) ?? null,
    friday_hours: (initialData?.friday_hours as number) ?? null,
    saturday_hours: (initialData?.saturday_hours as number) ?? null,
    sunday_hours: (initialData?.sunday_hours as number) ?? null,
    monday_start_time: initialData?.monday_start_time ?? null,
    monday_end_time: initialData?.monday_end_time ?? null,
    tuesday_start_time: initialData?.tuesday_start_time ?? null,
    tuesday_end_time: initialData?.tuesday_end_time ?? null,
    wednesday_start_time: initialData?.wednesday_start_time ?? null,
    wednesday_end_time: initialData?.wednesday_end_time ?? null,
    thursday_start_time: initialData?.thursday_start_time ?? null,
    thursday_end_time: initialData?.thursday_end_time ?? null,
    friday_start_time: initialData?.friday_start_time ?? null,
    friday_end_time: initialData?.friday_end_time ?? null,
    saturday_start_time: initialData?.saturday_start_time ?? null,
    saturday_end_time: initialData?.saturday_end_time ?? null,
    sunday_start_time: initialData?.sunday_start_time ?? null,
    sunday_end_time: initialData?.sunday_end_time ?? null,
    notes: initialData?.notes ?? null,
    priority: initialData?.priority ?? "low",
    timeOfDay: initialData?.timeOfDay ?? "any",
    accessMethod: initialData?.accessMethod ?? "key",
    pin: initialData?.pin ?? null,
    isAlarmSecured: initialData?.isAlarmSecured ?? false,
    alarmPassword: initialData?.alarmPassword ?? null,
    securityCodeWord: initialData?.securityCodeWord ?? null,
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodType<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedTimeOfDay = form.watch("timeOfDay");

  // Helper to update start/end times for a specific day
  const updateDailyTimes = useCallback((
    day: string,
    hours: number | null,
    currentTimeOfDay: string,
    triggeringField: 'hours' | 'startTime' | 'timeOfDay' // New parameter to know what triggered the update
  ) => {
    const startTimeKey = `${day}_start_time` as keyof ObjectFormValues;
    const endTimeKey = `${day}_end_time` as keyof ObjectFormValues;

    const currentStartTimeValue: string | null | undefined = form.getValues(startTimeKey);
    const currentEndTimeValue: string | null | undefined = form.getValues(endTimeKey);

    let newStartTime: string | null = null;
    let newEndTime: string | null = null;

    if (hours !== null && hours > 0) {
      let baseStartTimeForTimeOfDay = "08:00"; // Default for "any"
      if (currentTimeOfDay === "morning") {
        baseStartTimeForTimeOfDay = "08:00";
      } else if (currentTimeOfDay === "noon") {
        baseStartTimeForTimeOfDay = "12:00";
      } else if (currentTimeOfDay === "afternoon") {
        baseStartTimeForTimeOfDay = "17:00";
      }

      let effectiveStartTime: string;

      if (triggeringField === 'hours' || triggeringField === 'timeOfDay') {
        // If hours or timeOfDay changed, propose new start time based on timeOfDay,
        // but only if current start time is not set or invalid.
        // If current start time is a valid string, keep it.
        if (typeof currentStartTimeValue === 'string' && timeRegex.test(currentStartTimeValue)) {
          effectiveStartTime = currentStartTimeValue;
        } else {
          effectiveStartTime = baseStartTimeForTimeOfDay;
        }
        newStartTime = effectiveStartTime;
        newEndTime = calculateEndTime(effectiveStartTime, hours);
      } else if (triggeringField === 'startTime') {
        // If start time was manually changed, use it to calculate new end time
        if (typeof currentStartTimeValue === 'string' && timeRegex.test(currentStartTimeValue)) {
          effectiveStartTime = currentStartTimeValue; // Use the manually entered start time
          newStartTime = effectiveStartTime;
          newEndTime = calculateEndTime(effectiveStartTime, hours);
        } else {
          // If manual start time is invalid/cleared, revert to base logic
          effectiveStartTime = baseStartTimeForTimeOfDay;
          newStartTime = effectiveStartTime;
          newEndTime = calculateEndTime(effectiveStartTime, hours);
        }
      }
    } else {
      // If hours are null or 0, clear times for this specific day
      newStartTime = null;
      newEndTime = null;
    }

    // Only update if values are actually different to prevent unnecessary re-renders
    if (currentStartTimeValue !== newStartTime) {
      form.setValue(startTimeKey, newStartTime, { shouldValidate: true });
    }
    if (currentEndTimeValue !== newEndTime) {
      form.setValue(endTimeKey, newEndTime, { shouldValidate: true });
    }
  }, [form]); // form is the only dependency for useCallback

  // Effect to re-calculate times when timeOfDay changes
  useEffect(() => {
    dayNames.forEach(day => {
      const hoursValue = form.getValues(`${day}_hours` as keyof ObjectFormValues);
      const currentStartTime = form.getValues(`${day}_start_time` as keyof ObjectFormValues);
      const hoursToPass = typeof hoursValue === 'number' ? hoursValue : null;
      
      // Only update if hours are present for that day, or if we are clearing times
      if (hoursToPass !== null || currentStartTime !== null || form.getValues(`${day}_end_time` as keyof ObjectFormValues) !== null) {
        updateDailyTimes(day, hoursToPass, selectedTimeOfDay, 'timeOfDay');
      }
    });
  }, [selectedTimeOfDay, updateDailyTimes, dayNames, form]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: customersData } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (customersData) setCustomers(customersData);
    };
    fetchData();
  }, [supabase]);

  const fetchCustomerContacts = async (customerId: string) => {
    const { data: contactsData } = await supabase.from('customer_contacts').select('id, first_name, last_name, customer_id').eq('customer_id', customerId).order('last_name', { ascending: true });
    if (contactsData) setCustomerContacts(contactsData);
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      // Only set if it's not already null
      if (form.getValues("customerContactId") !== null) {
        form.setValue("customerContactId", null);
      }
      setCustomerContacts([]); // This state update will cause a re-render, but it's necessary.
    }
  }, [selectedCustomerId, supabase, form]);

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    const result = await onSubmit(data);
    handleActionResponse(result); // Nutze die neue Utility
    if (result.success) {
      if (!initialData) form.reset();
      onSuccess?.();
    }
  };

  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId);
      form.setValue("customerContactId", newContactId);
    }
  };

  const accessMethod = form.watch("accessMethod");
  const isAlarmSecured = form.watch("isAlarmSecured");

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      {/* Grundlegende Objektinformationen */}
      <div>
        <Label htmlFor="name">Name des Objekts</Label>
        <Input id="name" {...form.register("name")} placeholder="Name des Objekts" />
        {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea id="address" {...form.register("address")} placeholder="Z.B. Musterstraße 1, 12345 Musterstadt" rows={3} />
        {form.formState.errors.address && <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea id="description" {...form.register("description")} placeholder="Beschreibung (optional)" rows={3} />
      </div>
      
      {/* Kunde und Kontakt */}
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select onValueChange={(value) => form.setValue("customerId", value)} value={form.watch("customerId")}>
          <SelectTrigger><SelectValue placeholder="Kunde auswählen" /></SelectTrigger>
          <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="customerContactId">Objektleiter auswählen</Label>
          <Select onValueChange={(v) => form.setValue("customerContactId", v === "unassigned" ? null : v)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
            <SelectTrigger><SelectValue placeholder="Objektleiter auswählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Objektleiter</SelectItem>
              {customerContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {form.formState.errors.customerContactId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>}
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>

      {/* Auftragseinstellungen */}
      <h3 className="text-lg font-semibold mt-6">Auftragseinstellungen</h3>
      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select onValueChange={(v) => form.setValue("priority", v as any)} value={form.watch("priority")}>
          <SelectTrigger><SelectValue placeholder="Priorität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Niedrig</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.priority && <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>}
      </div>
      <div>
        <Label htmlFor="timeOfDay">Tageszeit</Label>
        <Select onValueChange={(v) => form.setValue("timeOfDay", v as any)} value={form.watch("timeOfDay")}>
          <SelectTrigger><SelectValue placeholder="Tageszeit" /></SelectTrigger>
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
        <Label htmlFor="notes">Notizen für Aufträge (optional)</Label>
        <Textarea id="notes" {...form.register("notes")} placeholder="Notizen für Aufträge (optional)" rows={3} />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      {/* Arbeitszeiten pro Wochentag */}
      <h3 className="text-lg font-semibold mt-6">Arbeitsplan pro Wochentag</h3>
      {dayNames.map(day => (
        <div key={day} className="p-3 border rounded-md space-y-2">
          <Label className="font-medium">{germanDayNames[day]}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"> {/* Adjusted to grid-cols-1 for mobile */}
            <div>
              <Label htmlFor={`${day}_hours`} className="text-xs">Netto-Std.</Label>
              <Input
                id={`${day}_hours`}
                type="number"
                step="0.01"
                {...form.register(`${day}_hours` as keyof ObjectFormValues, {
                  onChange: (e) => {
                    const value = e.target.value;
                    const parsedHours = value === "" ? null : Number(value);
                    form.setValue(`${day}_hours` as keyof ObjectFormValues, parsedHours);
                    // When hours change, re-calculate times for this specific day
                    updateDailyTimes(day, parsedHours, selectedTimeOfDay, 'hours');
                  }
                })}
                placeholder="z.B. 7.5"
              />
              {form.formState.errors[(`${day}_hours`) as keyof ObjectFormValues] && <p className="text-red-500 text-xs mt-1">{form.formState.errors[(`${day}_hours`) as keyof ObjectFormValues]?.message}</p>}
            </div>
            <div>
              <Label htmlFor={`${day}_start_time`} className="text-xs">Start</Label>
              <Input
                id={`${day}_start_time`}
                type="time"
                {...form.register(`${day}_start_time` as keyof ObjectFormValues, {
                  onChange: (e) => {
                    const newStartTime = e.target.value;
                    form.setValue(`${day}_start_time` as keyof ObjectFormValues, newStartTime);
                    // When start time changes, re-calculate end time based on hours
                    const hoursValue = form.getValues(`${day}_hours` as keyof ObjectFormValues);
                    const hoursToPass = typeof hoursValue === 'number' ? hoursValue : null;
                    if (hoursToPass !== null && hoursToPass > 0 && newStartTime && timeRegex.test(newStartTime)) {
                      const calculatedEndTime = calculateEndTime(newStartTime, hoursToPass);
                      form.setValue(`${day}_end_time` as keyof ObjectFormValues, calculatedEndTime, { shouldValidate: true });
                    } else if (hoursToPass === null || hoursToPass === 0) {
                      // If no hours, clear end time if start time is cleared
                      form.setValue(`${day}_end_time` as keyof ObjectFormValues, null, { shouldValidate: true });
                    }
                  }
                })}
              />
              {form.formState.errors[(`${day}_start_time`) as keyof ObjectFormValues] && <p className="text-red-500 text-xs mt-1">{form.formState.errors[(`${day}_start_time`) as keyof ObjectFormValues]?.message}</p>}
            </div>
            <div>
              <Label htmlFor={`${day}_end_time`} className="text-xs">Ende</Label>
              <Input id={`${day}_end_time`} type="time" {...form.register(`${day}_end_time` as keyof ObjectFormValues)} />
              {form.formState.errors[(`${day}_end_time`) as keyof ObjectFormValues] && <p className="text-red-500 text-xs mt-1">{form.formState.errors[(`${day}_end_time`) as keyof ObjectFormValues]?.message}</p>}
            </div>
          </div>
        </div>
      ))}

      {/* Zugangsinformationen */}
      <h3 className="text-lg font-semibold mt-6">Zugangsinformationen</h3>
      <div>
        <Label htmlFor="accessMethod">Zugangsmethode</Label>
        <Select onValueChange={(v) => form.setValue("accessMethod", v as any)} value={accessMethod}>
          <SelectTrigger><SelectValue placeholder="Zugangsmethode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="key">Schlüssel</SelectItem>
            <SelectItem value="card">Karte</SelectItem>
            <SelectItem value="other">Andere</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.accessMethod && <p className="text-red-500 text-sm mt-1">{form.formState.errors.accessMethod.message}</p>}
      </div>
      {accessMethod === "card" && (
        <div>
          <Label htmlFor="pin">PIN (optional)</Label>
          <Input id="pin" {...form.register("pin")} placeholder="PIN (optional)" />
          {form.formState.errors.pin && <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>}
        </div>
      )}
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="isAlarmSecured">Alarmgesichert?</Label>
        <Switch id="isAlarmSecured" checked={isAlarmSecured} onCheckedChange={(c) => form.setValue("isAlarmSecured", c)} />
      </div>
      {form.formState.errors.isAlarmSecured && <p className="text-red-500 text-sm mt-1">{form.formState.errors.isAlarmSecured.message}</p>}
      {isAlarmSecured && (
        <>
          <div>
            <Label htmlFor="alarmPassword">Alarmkennwort (optional)</Label>
            <Input id="alarmPassword" {...form.register("alarmPassword")} placeholder="Alarmkennwort (optional)" />
            {form.formState.errors.alarmPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.alarmPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="securityCodeWord">Codewort für Security (optional)</Label>
            <Input id="securityCodeWord" {...form.register("securityCodeWord")} placeholder="Codewort für Security (optional)" />
            {form.formState.errors.securityCodeWord && <p className="text-red-500 text-sm mt-1">{form.formState.errors.securityCodeWord.message}</p>}
          </div>
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}