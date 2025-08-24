"use client";

import { useForm, SubmitHandler, FieldPath, Controller } from "react-hook-form";
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

const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_daily_schedules: z.string().optional().nullable(), // New JSONB field
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
  daily_schedules: z.string().optional().nullable(), // New JSONB field
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
  // Basic JSON validation for daily_schedules
  if (data.daily_schedules) {
    try {
      JSON.parse(data.daily_schedules);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ungültiges JSON-Format für tägliche Zeitpläne.",
        path: ["daily_schedules"],
      });
    }
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
    daily_schedules: initialData?.daily_schedules ?? '[]', // Default to empty JSON array string
    recurrence_interval_weeks: (initialData?.recurrence_interval_weeks as number | undefined) ?? 1,
    start_week_offset: (initialData?.start_week_offset as number | undefined) ?? 0,
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const selectedCustomerId = form.watch("customerId");
  
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

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    const result = await onSubmit(data);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
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
              max={form.watch("recurrence_interval_weeks") - 1}
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
        <h3 className="text-lg font-semibold">Regelmäßige Arbeitszeiten pro Wochentag (JSON)</h3>
        <p className="text-sm text-muted-foreground">
          Geben Sie die Zeitpläne als JSON-Array ein. Beispiel:
          `[{"day_of_week": "monday", "week_offset_in_cycle": 0, "hours": 8, "start_time": "08:00", "end_time": "16:00"}, {"day_of_week": "monday", "week_offset_in_cycle": 1, "hours": 6, "start_time": "09:00", "end_time": "15:00"}]`
        </p>
        <Textarea
          id="daily_schedules"
          {...form.register("daily_schedules")}
          placeholder="[{'day_of_week': 'monday', 'week_offset_in_cycle': 0, 'hours': 8, 'start_time': '08:00', 'end_time': '16:00'}]"
          rows={10}
          className="font-mono text-xs"
        />
        {form.formState.errors.daily_schedules && <p className="text-red-500 text-sm mt-1">{form.formState.errors.daily_schedules.message}</p>}
      </div>
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}