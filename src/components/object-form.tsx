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
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client"; // Importiere Supabase Client
import { Switch } from "@/components/ui/switch"; // Importiere Switch Komponente

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  // Neue Felder für Wochentags-Start-/Endzeiten
  mondayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  mondayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  tuesdayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  tuesdayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  wednesdayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  wednesdayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  thursdayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  thursdayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  fridayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  fridayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  saturdayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  saturdayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  sundayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  sundayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Zeitformat (HH:MM)").optional().nullable(),
  // Bestehende Felder
  defaultNotes: z.string().max(500, "Standard-Notizen sind zu lang").optional().nullable(),
  defaultPriority: z.enum(["low", "medium", "high"]).default("low"),
  defaultTimeOfDay: z.enum(["morning", "noon", "afternoon", "any"]).default("any"),
  accessMethod: z.enum(["key", "card", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
  // Neues Feld für Alarmgesichert
  isAlarmSecured: z.boolean().default(false),
  alarmPassword: z.string().max(50, "Alarmkennwort ist zu lang").optional().nullable(),
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

  // Helper function to get the correct field name type for form.register
  // This ensures TypeScript knows the exact string literal type
  const getDayTimeFieldName = (day: string, type: 'StartTime' | 'EndTime'): keyof ObjectFormValues => {
    // This cast is safe because we know 'day' is one of the dayNames and 'type' is 'StartTime' or 'EndTime'
    // and the schema defines all combinations (e.g., 'mondayStartTime', 'mondayEndTime')
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
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
  });

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
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
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

      <h3 className="text-lg font-semibold mt-6">Standard-Arbeitszeiten pro Wochentag</h3>
      {dayNames.map(day => (
        <div key={day} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={getDayTimeFieldName(day, 'StartTime')}>{day.charAt(0).toUpperCase() + day.slice(1)} Start</Label>
            <Input
              id={getDayTimeFieldName(day, 'StartTime')}
              type="time"
              {...form.register(getDayTimeFieldName(day, 'StartTime'))}
            />
            {form.formState.errors[getDayTimeFieldName(day, 'StartTime')] && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors[getDayTimeFieldName(day, 'StartTime')]?.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor={getDayTimeFieldName(day, 'EndTime')}>{day.charAt(0).toUpperCase() + day.slice(1)} Ende</Label>
            <Input
              id={getDayTimeFieldName(day, 'EndTime')}
              type="time"
              {...form.register(getDayTimeFieldName(day, 'EndTime'))}
            />
            {form.formState.errors[getDayTimeFieldName(day, 'EndTime')] && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors[getDayTimeFieldName(day, 'EndTime')]?.message}</p>
            )}
          </div>
        </div>
      ))}

      <h3 className="text-lg font-semibold mt-6">Standard-Auftragseinstellungen für dieses Objekt</h3>
      <div>
        <Label htmlFor="defaultNotes">Standard-Notizen für Aufträge (optional)</Label>
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
        <Label htmlFor="defaultPriority">Standard-Priorität</Label>
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
      <div>
        <Label htmlFor="defaultTimeOfDay">Standard-Tageszeit</Label>
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
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}