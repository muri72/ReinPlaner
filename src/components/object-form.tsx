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

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  // Neue Felder für Wochentagsstunden
  mondayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  tuesdayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  wednesdayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  thursdayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  fridayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  saturdayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  sundayHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Muss 0 oder größer sein").max(24, "Muss 24 oder kleiner sein").nullable().optional()
  ),
  // Neue Felder für Standardwerte und Zugang
  defaultNotes: z.string().max(500, "Standard-Notizen sind zu lang").optional().nullable(),
  defaultPriority: z.enum(["low", "medium", "high"]).default("low"),
  defaultTimeOfDay: z.enum(["morning", "noon", "afternoon", "any"]).default("any"),
  accessMethod: z.enum(["key", "card", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
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

  // Define a type for the day hour keys to ensure type safety
  type DayHourKey = 'mondayHours' | 'tuesdayHours' | 'wednesdayHours' | 'thursdayHours' | 'fridayHours' | 'saturdayHours' | 'sundayHours';
  const dayHourKeys: DayHourKey[] = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];


  const resolvedDefaultValues: ObjectFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? null,
    customerId: initialData?.customerId ?? "",
    // Explicitly cast to number | null | undefined to resolve type errors
    mondayHours: (initialData?.mondayHours as number | null | undefined) ?? 0,
    tuesdayHours: (initialData?.tuesdayHours as number | null | undefined) ?? 0,
    wednesdayHours: (initialData?.wednesdayHours as number | null | undefined) ?? 0,
    thursdayHours: (initialData?.thursdayHours as number | null | undefined) ?? 0,
    fridayHours: (initialData?.fridayHours as number | null | undefined) ?? 0,
    saturdayHours: (initialData?.saturdayHours as number | null | undefined) ?? 0,
    sundayHours: (initialData?.sundayHours as number | null | undefined) ?? 0,
    defaultNotes: initialData?.defaultNotes ?? null,
    defaultPriority: initialData?.defaultPriority ?? "low",
    defaultTimeOfDay: initialData?.defaultTimeOfDay ?? "any",
    accessMethod: initialData?.accessMethod ?? "key",
    pin: initialData?.pin ?? null,
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

      <h3 className="text-lg font-semibold mt-6">Standard-Arbeitszeiten pro Wochentag (Stunden)</h3>
      <div className="grid grid-cols-2 gap-4">
        {dayHourKeys.map(dayKey => (
          <div key={dayKey}>
            <Label htmlFor={dayKey}>
              {dayKey.replace('Hours', '').charAt(0).toUpperCase() + dayKey.replace('Hours', '').slice(1)}
            </Label>
            <Input
              id={dayKey}
              type="number"
              step="0.5"
              {...form.register(dayKey)}
              placeholder="0"
            />
            {form.formState.errors[dayKey] && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors[dayKey]?.message}</p>
            )}
          </div>
        ))}
      </div>

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
        <>
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
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}