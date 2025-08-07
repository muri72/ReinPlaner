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
import { useState, useEffect, useMemo } from "react"; // Removed useRef
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebouncedCallback } from "use-debounce";

// Helper to calculate hours between two time strings (HH:MM)
const calculateHours = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date(0, 0, 0, startH, startM);
  let endDate = new Date(0, 0, 0, endH, endM);

  // If end time is earlier than start time, assume it's the next day
  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

// Helper to generate times from hours and timeOfDay
const generateTimesFromHours = (hours: number, timeOfDay: ObjectFormValues['defaultTimeOfDay']): { startTime: string, endTime: string } => {
  let startHour: number;
  switch (timeOfDay) {
    case 'morning': startHour = 8; break; // 8 AM
    case 'noon': startHour = 12; break; // 12 PM
    case 'afternoon': startHour = 16; break; // 4 PM
    case 'any': default: startHour = 9; break; // Default to 9 AM for 'any'
  }

  const totalMinutes = hours * 60;
  const endHour = startHour + Math.floor(totalMinutes / 60);
  const endMinute = Math.round(totalMinutes % 60);

  const formatTime = (h: number, m: number) => {
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date.toTimeString().slice(0, 5); // "HH:MM"
  };

  return {
    startTime: formatTime(startHour, 0),
    endTime: formatTime(endHour, endMinute),
  };
};

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  // Neue Felder für Wochentags-Start-/Endzeiten
  mondayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  mondayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  tuesdayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  tuesdayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  wednesdayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  wednesdayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  thursdayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  thursdayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  fridayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  fridayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  saturdayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  saturdayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  sundayStartTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  sundayEndTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)"), z.null()]).optional(),
  // Bestehende Felder
  defaultNotes: z.string().max(500, "Standard-Notizen sind zu lang").optional().nullable(),
  defaultPriority: z.enum(["low", "medium", "high"]).default("low"),
  defaultTimeOfDay: z.enum(["morning", "noon", "afternoon", "any"]).default("any"),
  accessMethod: z.enum(["key", "card", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
  // Neue Felder für Alarmgesichert und Codewort
  isAlarmSecured: z.boolean().default(false),
  alarmPassword: z.string().max(50, "Alarmkennwort ist zu lang").optional().nullable(),
  securityCodeWord: z.string().max(50, "Codewort ist zu lang").optional().nullable(),
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

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // State to manage which days are active (checkboxes)
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>(() => {
    const initialActiveDays: Record<string, boolean> = {};
    dayNames.forEach(day => {
      const startTimeKey = `${day}StartTime` as keyof ObjectFormInput;
      initialActiveDays[day] = !!initialData?.[startTimeKey];
    });
    return initialActiveDays;
  });

  // Local state for hours input for each day
  const [dayHoursInputs, setDayHoursInputs] = useState<Record<string, string>>(() => {
    const initialHours: Record<string, string> = {};
    dayNames.forEach(day => {
      const startTime = (initialData?.[`${day}StartTime` as keyof ObjectFormInput] ?? null) as string | null;
      const endTime = (initialData?.[`${day}EndTime` as keyof ObjectFormInput] ?? null) as string | null;
      const hours = calculateHours(startTime, endTime);
      initialHours[day] = hours !== null ? hours.toFixed(2) : '';
    });
    return initialHours;
  });

  // Helper function to get the correct field name type for form.register
  const getDayTimeFieldName = (day: string, type: 'StartTime' | 'EndTime'): keyof ObjectFormValues => {
    return `${day}${type}` as keyof ObjectFormValues;
  };

  const resolvedDefaultValues: ObjectFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? null,
    customerId: initialData?.customerId ?? "",
    // Initialwerte für neue Zeitfelder
    mondayStartTime: initialData?.mondayStartTime ?? null,
    mondayEndTime: initialData?.mondayEndTime ?? null,
    tuesdayStartTime: initialData?.tuesdayStartTime ?? null,
    tuesdayEndTime: initialData?.tuesdayEndTime ?? null,
    wednesdayStartTime: initialData?.wednesdayStartTime ?? null,
    wednesdayEndTime: initialData?.wednesdayEndTime ?? null,
    thursdayStartTime: initialData?.thursdayStartTime ?? null,
    thursdayEndTime: initialData?.thursdayEndTime ?? null,
    fridayStartTime: initialData?.fridayStartTime ?? null,
    fridayEndTime: initialData?.fridayEndTime ?? null,
    saturdayStartTime: initialData?.saturdayStartTime ?? null,
    saturdayEndTime: initialData?.saturdayEndTime ?? null,
    sundayStartTime: initialData?.sundayStartTime ?? null,
    sundayEndTime: initialData?.sundayEndTime ?? null,
    // Bestehende Felder
    defaultNotes: initialData?.defaultNotes ?? null,
    defaultPriority: initialData?.defaultPriority ?? "low",
    defaultTimeOfDay: initialData?.defaultTimeOfDay ?? "any",
    accessMethod: initialData?.accessMethod ?? "key",
    pin: initialData?.pin ?? null,
    isAlarmSecured: initialData?.isAlarmSecured ?? false,
    alarmPassword: initialData?.alarmPassword ?? null,
    securityCodeWord: initialData?.securityCodeWord ?? null, // Initialwert für neues Feld
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  // Watch defaultTimeOfDay for changes
  const defaultTimeOfDay = form.watch("defaultTimeOfDay");

  // Debounced function to update time fields based on hours input
  const debouncedUpdateTimes = useDebouncedCallback((day: string, hoursValue: string, timeOfDay: ObjectFormValues['defaultTimeOfDay']) => {
    const parsedHours = parseFloat(hoursValue);
    const startTimeField = getDayTimeFieldName(day, 'StartTime');
    const endTimeField = getDayTimeFieldName(day, 'EndTime');

    if (!isNaN(parsedHours) && parsedHours > 0) {
      const { startTime, endTime } = generateTimesFromHours(parsedHours, timeOfDay);
      form.setValue(startTimeField, startTime);
      form.setValue(endTimeField, endTime);
    } else {
      form.setValue(startTimeField, null);
      form.setValue(endTimeField, null);
    }
  }, 500); // Debounce for 500ms


  // Kunden für Dropdown laden
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (data) setCustomers(data);
      if (error) console.error("Fehler beim Laden der Kunden:", error);
    };
    fetchCustomers();
  }, [supabase]);

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    // Create a mutable copy of data
    const dataToSubmit: ObjectFormValues = { ...data };

    dayNames.forEach(day => {
      const startTimeField = getDayTimeFieldName(day, 'StartTime');
      const endTimeField = getDayTimeFieldName(day, 'EndTime');
      if (!activeDays[day]) {
        // Explicitly cast the property to its expected type to allow null assignment
        (dataToSubmit[startTimeField] as ObjectFormValues[typeof startTimeField]) = null;
        (dataToSubmit[endTimeField] as ObjectFormValues[typeof endTimeField]) = null;
      }
    });

    const result = await onSubmit(dataToSubmit);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
        // Reset active days state as well
        setActiveDays(dayNames.reduce((acc, day) => ({ ...acc, [day]: false }), {}));
        setDayHoursInputs(dayNames.reduce((acc, day) => ({ ...acc, [day]: '' }), {})); // Reset hours inputs
      }
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  const accessMethod = form.watch("accessMethod");
  const isAlarmSecured = form.watch("isAlarmSecured");

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      <div>
        <Label htmlFor="name">Objektname</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Z.B. Hauptgebäude"
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
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
      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Zusätzliche Details zum Objekt..."
          rows={3}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="customerId">Zugehöriger Kunde</Label>
        <Select onValueChange={(value) => form.setValue("customerId", value)} value={form.watch("customerId")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>

      <h3 className="text-lg font-semibold mt-6">Auftragseinstellungen für dieses Objekt</h3>
      <div>
        <Label htmlFor="defaultNotes">Notizen für Aufträge (optional)</Label>
        <Textarea
          id="defaultNotes"
          {...form.register("defaultNotes")}
          placeholder="Standard-Notizen, die in neue Aufträge übernommen werden..."
          rows={3}
        />
        {form.formState.errors.defaultNotes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.defaultNotes.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="defaultPriority">Priorität</Label>
        <Select onValueChange={(value) => form.setValue("defaultPriority", value as "low" | "medium" | "high")} value={form.watch("defaultPriority")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Priorität auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Niedrig</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.defaultPriority && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.defaultPriority.message}</p>
        )}
      </div>
      {/* Moved defaultTimeOfDay here */}
      <div>
        <Label htmlFor="defaultTimeOfDay">Tageszeit</Label>
        <Select onValueChange={(value) => form.setValue("defaultTimeOfDay", value as "morning" | "noon" | "afternoon" | "any")} value={form.watch("defaultTimeOfDay")}>
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
        {form.formState.errors.defaultTimeOfDay && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.defaultTimeOfDay.message}</p>
        )}
      </div>

      <h3 className="text-lg font-semibold mt-6">Arbeitszeiten pro Wochentag</h3>
      {dayNames.map(day => {
        const startTimeField = getDayTimeFieldName(day, 'StartTime');
        const endTimeField = getDayTimeFieldName(day, 'EndTime');
        const currentStartTime = form.watch(startTimeField) as string | null;
        const currentEndTime = form.watch(endTimeField) as string | null;
        const calculatedHours = useMemo(() => calculateHours(currentStartTime, currentEndTime), [currentStartTime, currentEndTime]);

        return (
          <div key={day} className="space-y-2 border p-3 rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${day}Active`}
                checked={activeDays[day]}
                onCheckedChange={(checked) => {
                  setActiveDays(prev => ({ ...prev, [day]: !!checked }));
                  if (!checked) {
                    form.setValue(startTimeField, null);
                    form.setValue(endTimeField, null);
                    setDayHoursInputs(prev => ({ ...prev, [day]: '' })); // Clear hours input as well
                  }
                }}
              />
              <Label htmlFor={`${day}Active`}>{day.charAt(0).toUpperCase() + day.slice(1)}</Label>
            </div>
            {activeDays[day] && (
              <div className="grid grid-cols-3 gap-4 mt-2 items-end"> {/* Changed to 3 columns */}
                <div>
                  <Label htmlFor={startTimeField}>Start</Label>
                  <Input
                    id={startTimeField}
                    type="time"
                    {...form.register(startTimeField)} // Removed onChange here
                  />
                  {form.formState.errors[startTimeField] && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors[startTimeField]?.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor={endTimeField}>Ende</Label>
                  <Input
                    id={endTimeField}
                    type="time"
                    {...form.register(endTimeField)} // Removed onChange here
                  />
                  {form.formState.errors[endTimeField] && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors[endTimeField]?.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`${day}Hours`}>Stunden</Label>
                  <Input
                    id={`${day}Hours`}
                    type="text" // Changed to text to allow comma input
                    placeholder="Stunden"
                    value={dayHoursInputs[day]}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Replace comma with dot for parsing
                      value = value.replace(',', '.');
                      setDayHoursInputs(prev => ({ ...prev, [day]: value }));
                      debouncedUpdateTimes(day, value, defaultTimeOfDay); // Call debounced function
                    }}
                  />
                  {/* No error message for hours input as it's derived */}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <h3 className="text-lg font-semibold mt-6">Zugangsinformationen</h3>
      <div>
        <Label htmlFor="accessMethod">Zugangsmethode</Label>
        <Select onValueChange={(value) => form.setValue("accessMethod", value as "key" | "card" | "other")} value={form.watch("accessMethod")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Zugangsmethode auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="key">Schlüssel</SelectItem>
            <SelectItem value="card">Karte</SelectItem>
            <SelectItem value="other">Andere</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.accessMethod && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.accessMethod.message}</p>
        )}
      </div>

      {accessMethod === "card" && (
        <div>
          <Label htmlFor="pin">PIN (optional)</Label>
          <Input
            id="pin"
            {...form.register("pin")}
            placeholder="PIN für den Zugang"
          />
          {form.formState.errors.pin && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="isAlarmSecured">Alarmgesichert?</Label>
        <Switch
          id="isAlarmSecured"
          checked={isAlarmSecured}
          onCheckedChange={(checked) => form.setValue("isAlarmSecured", checked)}
        />
      </div>

      {isAlarmSecured && (
        <>
          <div>
            <Label htmlFor="alarmPassword">Alarmkennwort (optional)</Label>
            <Input
              id="alarmPassword"
              {...form.register("alarmPassword")}
              placeholder="Alarmkennwort"
            />
            {form.formState.errors.alarmPassword && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.alarmPassword.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="securityCodeWord">Codewort für Security (optional)</Label>
            <Input
              id="securityCodeWord"
              {...form.register("securityCodeWord")}
              placeholder="Codewort für Security"
            />
            {form.formState.errors.securityCodeWord && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.securityCodeWord.message}</p>
            )}
          </div>
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}