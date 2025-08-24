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
import { getWeek } from 'date-fns'; // Import getWeek

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

interface DailySchedule {
  day_of_week: string;
  week_offset_in_cycle: number;
  hours: number;
  start_time: string;
  end_time: string;
}

// Helper to parse daily schedules from JSONB
const parseDailySchedules = (jsonb: any): DailySchedule[] => {
  if (!jsonb) return [];
  return Array.isArray(jsonb) ? jsonb : [];
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function TimeEntryForm({ initialData, onSubmit, submitButtonText, onSuccess, currentUserId, isAdmin }: TimeEntryFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<{ 
    id: string; 
    name: string; 
    customer_id: string; 
    daily_schedules: any; 
    recurrence_interval_weeks: number; 
    start_week_offset: number; 
  }[]>([]);
  const [orders, setOrders] = useState<{ 
    id: string; 
    title: string; 
    customer_id: string; 
    object_id: string; 
    order_type: string;
    recurring_start_date: string | null;
    due_date: string | null;
    object: { daily_schedules: any; recurrence_interval_weeks: number; start_week_offset: number; } | null; // Added object details
    assigned_daily_schedules: any;
    assigned_recurrence_interval_weeks: number;
    assigned_start_week_offset: number;
  }[]>([]);

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
  const selectedOrderId = form.watch("orderId");
  const selectedStartDate = form.watch("startDate"); // Watch for startDate changes
  const selectedType = form.watch("type");

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchDropdownData = async () => {
      // Fetch all employees if admin, otherwise only the employee linked to the current user
      let employeesQuery = supabase.from('employees').select('id, first_name, last_name, user_id').order('last_name', { ascending: true });
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

      // Fetch all object details including daily_schedules
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, daily_schedules, recurrence_interval_weeks, start_week_offset').order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: ordersData, error: ordersError } = await supabase.from('orders').select('id, title, customer_id, object_id, order_type, recurring_start_date, due_date, objects ( daily_schedules, recurrence_interval_weeks, start_week_offset ), order_employee_assignments ( assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset )').order('title', { ascending: true });
      if (ordersData) {
        setOrders(ordersData.map(order => ({
          ...order,
          object: Array.isArray(order.objects) ? order.objects[0] : order.objects, // Map nested object
          assigned_daily_schedules: order.order_employee_assignments?.[0]?.assigned_daily_schedules || null,
          assigned_recurrence_interval_weeks: order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks || null,
          assigned_start_week_offset: order.order_employee_assignments?.[0]?.assigned_start_week_offset || null,
        })));
      }
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

  // Intelligent pre-filling based on selected object/order and date
  useEffect(() => {
    if (selectedStartDate && (selectedObjectId || selectedOrderId)) {
      let schedulesToUse: DailySchedule[] = [];
      let recurrenceIntervalWeeks = 1;
      let startWeekOffset = 0;
      let orderStartDateForWeekCalc: Date | null = null;

      if (selectedOrderId) {
        const selectedOrder = orders.find(o => o.id === selectedOrderId);
        if (selectedOrder) {
          schedulesToUse = parseDailySchedules(selectedOrder.assigned_daily_schedules || selectedOrder.object?.daily_schedules || '[]');
          recurrenceIntervalWeeks = selectedOrder.assigned_recurrence_interval_weeks || selectedOrder.object?.recurrence_interval_weeks || 1;
          startWeekOffset = selectedOrder.assigned_start_week_offset || selectedOrder.object?.start_week_offset || 0;
          orderStartDateForWeekCalc = selectedOrder.recurring_start_date ? new Date(selectedOrder.recurring_start_date) : (selectedOrder.due_date ? new Date(selectedOrder.due_date) : selectedStartDate);
        }
      } else if (selectedObjectId) {
        const selectedObject = objects.find(obj => obj.id === selectedObjectId);
        if (selectedObject) {
          schedulesToUse = parseDailySchedules(selectedObject.daily_schedules);
          recurrenceIntervalWeeks = selectedObject.recurrence_interval_weeks;
          startWeekOffset = selectedObject.start_week_offset;
          orderStartDateForWeekCalc = selectedStartDate; // For object, use selectedStartDate as base
        }
      }

      if (schedulesToUse.length > 0 && orderStartDateForWeekCalc) {
        const dayOfWeek = selectedStartDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const currentDayName = dayNames[dayOfWeek];
        const currentWeekNumber = getWeek(selectedStartDate, { weekStartsOn: 1 });
        const startWeekNumber = getWeek(orderStartDateForWeekCalc, { weekStartsOn: 1 });
        const weekDifference = currentWeekNumber - startWeekNumber;
        const weekOffsetInCycle = weekDifference % recurrenceIntervalWeeks;

        const scheduleForDayAndOffset = schedulesToUse.find(s => 
          s.day_of_week === currentDayName && 
          s.week_offset_in_cycle === weekOffsetInCycle
        );

        if (scheduleForDayAndOffset && scheduleForDayAndOffset.hours > 0) {
          form.setValue("startTime", scheduleForDayAndOffset.start_time || new Date().toTimeString().slice(0, 5));
          form.setValue("endTime", scheduleForDayAndOffset.end_time || null);
          form.setValue("endDate", selectedStartDate); // Set end date to start date if times are found
          form.setValue("durationMinutes", Math.round(scheduleForDayAndOffset.hours * 60));
          // Recalculate break minutes based on new duration
          const grossDurationMinutes = Math.round(scheduleForDayAndOffset.hours * 60);
          let breakMinutes = 0;
          if (grossDurationMinutes > 9 * 60) {
              breakMinutes = 45;
          } else if (grossDurationMinutes > 6 * 60) {
              breakMinutes = 30;
          }
          form.setValue("breakMinutes", breakMinutes);
        } else {
          // Clear times if no schedule found for the day/offset
          form.setValue("startTime", new Date().toTimeString().slice(0, 5)); // Default to current time
          form.setValue("endTime", null);
          form.setValue("endDate", null);
          form.setValue("durationMinutes", null);
          form.setValue("breakMinutes", null);
        }
      } else if (!initialData) {
        // Reset to current time if object/order or date is cleared and not in edit mode
        form.setValue("startTime", new Date().toTimeString().slice(0, 5));
        form.setValue("endTime", null);
        form.setValue("endDate", null);
        form.setValue("durationMinutes", null);
        form.setValue("breakMinutes", null);
      }
    } else if (!initialData) {
      // Reset to current time if object/order or date is cleared and not in edit mode
      form.setValue("startTime", new Date().toTimeString().slice(0, 5));
      form.setValue("endTime", null);
      form.setValue("endDate", null);
      form.setValue("durationMinutes", null);
      form.setValue("breakMinutes", null);
    }
  }, [selectedObjectId, selectedOrderId, selectedStartDate, objects, orders, form, initialData]);


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