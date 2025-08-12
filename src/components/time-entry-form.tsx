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
import { DatePicker } from "@/components/date-picker";
import { calculateHours } from "@/lib/utils"; // Importiere von utils
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

export const timeEntrySchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  orderId: z.string().uuid("Ungültige Auftrags-ID").optional().nullable(),
  startDate: z.date({ required_error: "Startdatum ist erforderlich" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Startzeitformat (HH:MM)"),
  endDate: z.date().optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Endzeitformat (HH:MM)").optional().nullable(),
  durationMinutes: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Dauer muss positiv sein").max(99999, "Dauer ist zu hoch")).optional()
  ),
  breakMinutes: z.preprocess( // Neues Feld für Pausenminuten
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Pausenminuten müssen positiv sein").max(1440, "Pausenminuten sind zu hoch")).optional()
  ),
  type: z.enum(["manual", "clock_in_out", "stopwatch", "automatic_scheduled_order"]).default("manual"), // Typ umbenannt
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
}).superRefine((data, ctx) => {
  // Wenn Enddatum und Endzeit angegeben sind, müssen sie gültig sein
  if ((data.endDate && !data.endTime) || (!data.endDate && data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enddatum und Endzeit müssen beide angegeben oder beide weggelassen werden.",
      path: ["endDate"],
    });
  }

  // Wenn Start- und Enddatum/zeit vorhanden sind, prüfen, ob Endzeit nach Startzeit liegt
  if (data.startDate && data.startTime && data.endDate && data.endTime) {
    const startDateTime = new Date(data.startDate);
    const [startH, startM] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endH, endM] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM, 0, 0);

    if (endDateTime < startDateTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Endzeit muss nach der Startzeit liegen.",
        path: ["endTime"],
      });
    }
  }
});

export type TimeEntryFormInput = z.input<typeof timeEntrySchema>;
export type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

interface TimeEntryFormProps {
  initialData?: Partial<TimeEntryFormInput>;
  onSubmit: (data: TimeEntryFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function TimeEntryForm({ initialData, onSubmit, submitButtonText, onSuccess, currentUserId, isAdmin }: TimeEntryFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string; monday_start_time: string | null; monday_end_time: string | null; tuesday_start_time: string | null; tuesday_end_time: string | null; wednesday_start_time: string | null; wednesday_end_time: string | null; thursday_start_time: string | null; thursday_end_time: string | null; friday_start_time: string | null; friday_end_time: string | null; saturday_start_time: string | null; saturday_end_time: string | null; sunday_start_time: string | null; sunday_end_time: string | null; }[]>([]);
  const [orders, setOrders] = useState<{ id: string; title: string; customer_id: string; object_id: string }[]>([]);

  const resolvedDefaultValues: TimeEntryFormValues = {
    employeeId: initialData?.employeeId ?? null,
    customerId: initialData?.customerId ?? null,
    objectId: initialData?.objectId ?? null,
    orderId: initialData?.orderId ?? null,
    startDate: initialData?.startDate ?? new Date(),
    startTime: initialData?.startTime ?? new Date().toTimeString().slice(0, 5),
    endDate: initialData?.endDate ?? null,
    endTime: initialData?.endTime ?? null,
    durationMinutes: typeof initialData?.durationMinutes === 'number' ? initialData.durationMinutes : null,
    breakMinutes: typeof initialData?.breakMinutes === 'number' ? initialData.breakMinutes : null, // Initialwert für Pausenminuten
    type: initialData?.type ?? "manual",
    notes: initialData?.notes ?? null,
  };

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema as z.ZodSchema<TimeEntryFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const selectedStartDate = form.watch("startDate"); // Watch for startDate changes
  const selectedType = form.watch("type");

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchDropdownData = async () => {
      // Fetch all employees if admin, otherwise only the employee linked to the current user
      let employeesQuery = supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (!isAdmin) {
        employeesQuery = employeesQuery.eq('user_id', currentUserId);
      }
      const { data: employeesData, error: employeesError } = await employeesQuery;
      if (employeesData) {
        setEmployees(employeesData);
        // If not admin and an employee is found, set it as default
        if (!isAdmin && employeesData.length > 0) {
          form.setValue("employeeId", employeesData[0].id);
        }
      }
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);

      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      // Fetch all object details including time schedules
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time').order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: ordersData, error: ordersError } = await supabase.from('orders').select('id, title, customer_id, object_id').order('title', { ascending: true });
      if (ordersData) setOrders(ordersData);
      if (ordersError) console.error("Fehler beim Laden der Aufträge:", ordersError);
    };
    fetchDropdownData();
  }, [supabase, currentUserId, isAdmin, form]); // Abhängigkeiten aktualisiert

  // Filter objects and orders based on selected customer/object
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  const filteredOrders = selectedObjectId
    ? orders.filter(order => order.object_id === selectedObjectId)
    : (selectedCustomerId ? orders.filter(order => order.customer_id === selectedCustomerId) : []);

  // Reset object/order if customer/object changes
  useEffect(() => {
    if (selectedCustomerId && !filteredObjects.some(obj => obj.id === form.getValues("objectId"))) {
      form.setValue("objectId", null);
    }
    if (selectedObjectId && !filteredOrders.some(order => order.id === form.getValues("orderId"))) {
      form.setValue("orderId", null);
    }
  }, [selectedCustomerId, selectedObjectId, filteredObjects, filteredOrders, form]);

  // Intelligent pre-filling based on selected object and date
  useEffect(() => {
    if (selectedObjectId && selectedStartDate) {
      const selectedObject = objects.find(obj => obj.id === selectedObjectId);
      if (selectedObject) {
        const dayOfWeek = selectedStartDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let startTime: string | null = null;
        let endTime: string | null = null;

        switch (dayOfWeek) {
          case 0: // Sunday
            startTime = selectedObject.sunday_start_time;
            endTime = selectedObject.sunday_end_time;
            break;
          case 1: // Monday
            startTime = selectedObject.monday_start_time;
            endTime = selectedObject.monday_end_time;
            break;
          case 2: // Tuesday
            startTime = selectedObject.tuesday_start_time;
            endTime = selectedObject.tuesday_end_time;
            break;
          case 3: // Wednesday
            startTime = selectedObject.wednesday_start_time;
            endTime = selectedObject.wednesday_end_time;
            break;
          case 4: // Thursday
            startTime = selectedObject.thursday_start_time;
            endTime = selectedObject.thursday_end_time;
            break;
          case 5: // Friday
            startTime = selectedObject.friday_start_time;
            endTime = selectedObject.friday_end_time;
            break;
          case 6: // Saturday
            startTime = selectedObject.saturday_start_time;
            endTime = selectedObject.saturday_end_time;
            break;
        }

        if (startTime && endTime) {
          form.setValue("startTime", startTime);
          form.setValue("endTime", endTime);
          form.setValue("endDate", selectedStartDate); // Set end date to start date if times are found
          const duration = calculateHours(startTime, endTime);
          if (duration !== null) {
            form.setValue("durationMinutes", Math.round(duration * 60));
          }
        } else {
          // Clear times if no schedule found for the day
          form.setValue("startTime", new Date().toTimeString().slice(0, 5)); // Default to current time
          form.setValue("endTime", null);
          form.setValue("endDate", null);
          form.setValue("durationMinutes", null);
        }
      }
    } else if (!initialData) {
      // Reset to current time if object or date is cleared and not in edit mode
      form.setValue("startTime", new Date().toTimeString().slice(0, 5));
      form.setValue("endTime", null);
      form.setValue("endDate", null);
      form.setValue("durationMinutes", null);
    }
  }, [selectedObjectId, selectedStartDate, objects, form, initialData]);


  const handleFormSubmit: SubmitHandler<TimeEntryFormValues> = async (data) => {
    const result = await onSubmit(data);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      if (!initialData) {
        form.reset({
          startDate: new Date(),
          startTime: new Date().toTimeString().slice(0, 5),
          endDate: null,
          endTime: null,
          durationMinutes: null,
          breakMinutes: null, // Pausenminuten zurücksetzen
          employeeId: isAdmin ? null : form.getValues("employeeId"), // Nur zurücksetzen, wenn nicht Admin
          customerId: null,
          objectId: null,
          orderId: null,
          notes: null,
          type: "manual",
        });
      }
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      <div>
        <Label htmlFor="type">Eintragstyp</Label>
        <Select onValueChange={(value) => form.setValue("type", value as TimeEntryFormValues["type"])} value={selectedType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manuell</SelectItem>
            <SelectItem value="clock_in_out">Kommt/Geht</SelectItem>
            <SelectItem value="stopwatch">Stoppuhr</SelectItem>
            <SelectItem value="automatic_scheduled_order">Automatischer geplanter Auftrag</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="employeeId">Mitarbeiter (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value === "unassigned" ? null : value)}
          value={form.watch("employeeId") || "unassigned"}
          disabled={!isAdmin && employees.length > 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
            {employees.map(employee => (
              <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
        )}
        {!isAdmin && employees.length === 0 && (
          <p className="text-muted-foreground text-sm mt-1">Kein Mitarbeiterprofil gefunden. Bitte kontaktieren Sie Ihren Administrator.</p>
        )}
      </div>

      <div>
        <Label htmlFor="customerId">Kunde (optional)</Label>
        <Select onValueChange={(value) => {
          form.setValue("customerId", value);
          form.setValue("objectId", null);
          form.setValue("orderId", null);
        }} value={selectedCustomerId || "unassigned"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="objectId">Objekt (optional)</Label>
        <Select onValueChange={(value) => {
          form.setValue("objectId", value);
          form.setValue("orderId", null);
        }} value={selectedObjectId || "unassigned"} disabled={!selectedCustomerId || filteredObjects.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Objekt auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Objekt zugewiesen</SelectItem>
            {filteredObjects.map(obj => (
              <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.objectId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
        )}
        {selectedCustomerId && filteredObjects.length === 0 && (
          <p className="text-muted-foreground text-sm mt-1">Keine Objekte für diesen Kunden gefunden.</p>
        )}
      </div>

      <div>
        <Label htmlFor="orderId">Auftrag (optional)</Label>
        <Select onValueChange={(value) => form.setValue("orderId", value === "unassigned" ? null : value)} value={form.watch("orderId") || "unassigned"} disabled={(!selectedCustomerId && !selectedObjectId) || filteredOrders.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftrag auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
            {filteredOrders.map(order => (
              <SelectItem key={order.id} value={order.id}>{order.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.orderId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderId.message}</p>
        )}
        {((selectedCustomerId || selectedObjectId) && filteredOrders.length === 0) && (
          <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für diese Auswahl gefunden.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Startdatum"
          value={form.watch("startDate")}
          onChange={(date) => form.setValue("startDate", date || new Date())}
          error={form.formState.errors.startDate?.message}
        />
        <div>
          <Label htmlFor="startTime">Startzeit</Label>
          <Input
            id="startTime"
            type="time"
            {...form.register("startTime")}
          />
          {form.formState.errors.startTime && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.startTime.message}</p>
        )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Enddatum (optional)"
          value={form.watch("endDate")}
          onChange={(date) => form.setValue("endDate", date)}
          error={form.formState.errors.endDate?.message}
        />
        <div>
          <Label htmlFor="endTime">Endzeit (optional)</Label>
          <Input
            id="endTime"
            type="time"
            {...form.register("endTime")}
          />
          {form.formState.errors.endTime && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="durationMinutes">Dauer in Minuten (optional)</Label>
        <Input
          id="durationMinutes"
          type="number"
          step="1"
          {...form.register("durationMinutes", { valueAsNumber: true })}
          placeholder="Z.B. 120 für 2 Stunden"
        />
        {form.formState.errors.durationMinutes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.durationMinutes.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="breakMinutes">Pausenminuten (optional)</Label>
        <Input
          id="breakMinutes"
          type="number"
          step="1"
          {...form.register("breakMinutes", { valueAsNumber: true })}
          placeholder="Z.B. 30 für 30 Minuten"
        />
        {form.formState.errors.breakMinutes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.breakMinutes.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche Notizen zum Zeiteintrag..."
          rows={3}
        />
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}