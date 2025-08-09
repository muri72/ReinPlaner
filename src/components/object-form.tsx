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
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";

const preprocessNumber = (val: any) => (val === "" || isNaN(Number(val)) ? null : Number(val));
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const selectedCustomerId = form.watch("customerId");

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
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    const result = await onSubmit(data);
    if (result.success) {
      toast.success(result.message);
      if (!initialData) form.reset();
      onSuccess?.();
    } else {
      toast.error(result.message);
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
      <Input id="name" {...form.register("name")} placeholder="Name des Objekts" />
      <Textarea id="address" {...form.register("address")} placeholder="Adresse" rows={3} />
      <Textarea id="description" {...form.register("description")} placeholder="Beschreibung (optional)" rows={3} />
      
      {/* Kunde und Kontakt */}
      <Select onValueChange={(value) => form.setValue("customerId", value)} value={form.watch("customerId")}>
        <SelectTrigger><SelectValue placeholder="Kunde auswählen" /></SelectTrigger>
        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Select onValueChange={(v) => form.setValue("customerContactId", v === "unassigned" ? null : v)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
            <SelectTrigger><SelectValue placeholder="Objektleiter auswählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Objektleiter</SelectItem>
              {customerContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>

      {/* Arbeitszeiten pro Wochentag */}
      <h3 className="text-lg font-semibold mt-6">Arbeitsplan pro Wochentag</h3>
      {dayNames.map(day => (
        <div key={day} className="p-3 border rounded-md space-y-2">
          <Label className="font-medium">{germanDayNames[day]}</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor={`${day}_start_time`} className="text-xs">Start</Label>
              <Input id={`${day}_start_time`} type="time" {...form.register(`${day}_start_time` as keyof ObjectFormValues)} />
            </div>
            <div>
              <Label htmlFor={`${day}_end_time`} className="text-xs">Ende</Label>
              <Input id={`${day}_end_time`} type="time" {...form.register(`${day}_end_time` as keyof ObjectFormValues)} />
            </div>
            <div>
              <Label htmlFor={`${day}_hours`} className="text-xs">Netto-Std.</Label>
              <Input id={`${day}_hours`} type="number" step="0.01" {...form.register(`${day}_hours` as keyof ObjectFormValues)} placeholder="z.B. 7.5" />
            </div>
          </div>
        </div>
      ))}

      {/* Auftragseinstellungen */}
      <h3 className="text-lg font-semibold mt-6">Standard-Auftragseinstellungen</h3>
      <Textarea id="notes" {...form.register("notes")} placeholder="Notizen für Aufträge (optional)" rows={3} />
      <Select onValueChange={(v) => form.setValue("priority", v as any)} value={form.watch("priority")}>
        <SelectTrigger><SelectValue placeholder="Priorität" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Niedrig</SelectItem>
          <SelectItem value="medium">Mittel</SelectItem>
          <SelectItem value="high">Hoch</SelectItem>
        </SelectContent>
      </Select>
      <Select onValueChange={(v) => form.setValue("timeOfDay", v as any)} value={form.watch("timeOfDay")}>
        <SelectTrigger><SelectValue placeholder="Tageszeit" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Beliebig</SelectItem>
          <SelectItem value="morning">Vormittags</SelectItem>
          <SelectItem value="noon">Mittags</SelectItem>
          <SelectItem value="afternoon">Nachmittags</SelectItem>
        </SelectContent>
      </Select>

      {/* Zugangsinformationen */}
      <h3 className="text-lg font-semibold mt-6">Zugangsinformationen</h3>
      <Select onValueChange={(v) => form.setValue("accessMethod", v as any)} value={accessMethod}>
        <SelectTrigger><SelectValue placeholder="Zugangsmethode" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="key">Schlüssel</SelectItem>
          <SelectItem value="card">Karte</SelectItem>
          <SelectItem value="other">Andere</SelectItem>
        </SelectContent>
      </Select>
      {accessMethod === "card" && <Input id="pin" {...form.register("pin")} placeholder="PIN (optional)" />}
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="isAlarmSecured">Alarmgesichert?</Label>
        <Switch id="isAlarmSecured" checked={isAlarmSecured} onCheckedChange={(c) => form.setValue("isAlarmSecured", c)} />
      </div>
      {isAlarmSecured && (
        <>
          <Input id="alarmPassword" {...form.register("alarmPassword")} placeholder="Alarmkennwort (optional)" />
          <Input id="securityCodeWord" {...form.register("securityCodeWord")} placeholder="Codewort für Security (optional)" />
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}