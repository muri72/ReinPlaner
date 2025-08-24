"use client";

import { useForm, SubmitHandler, useFieldArray, FieldPath, Controller } from "react-hook-form";
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
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
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
}).superRefine((data, ctx) => {
  // Basic JSON validation for assigned_daily_schedules
  if (data.assigned_daily_schedules) {
    try {
      JSON.parse(data.assigned_daily_schedules);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ungültiges JSON-Format für zugewiesene tägliche Zeitpläne.",
        path: ["assigned_daily_schedules"],
      });
    }
  }
});

export type AssignedEmployee = z.infer<typeof assignedEmployeeSchema>;

export const orderSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  dueDate: z.date().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  orderType: z.enum(["one_time", "recurring", "substitution", "permanent"]).default("one_time"),
  recurringStartDate: z.date().optional().nullable(),
  recurringEndDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("low"),
  totalEstimatedHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(),
  requestStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  assignedEmployees: z.array(assignedEmployeeSchema).optional(),
});

export type OrderFormInput = z.input<typeof orderSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  initialData?: Partial<OrderFormInput>;
  onSubmit: (data: OrderFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function OrderForm({ initialData, onSubmit, submitButtonText, onSuccess }: OrderFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<{ 
    id: string; 
    name: string; 
    customer_id: string;
    daily_schedules: any; // Changed to any as it's JSONB
    recurrence_interval_weeks: number;
    start_week_offset: number;
  }[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [isNewObjectDialogOpen, setIsNewObjectDialogOpen] = useState(false);

  const resolvedDefaultValues: OrderFormValues = {
    title: initialData?.title ?? "",
    description: initialData?.description ?? null,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    status: initialData?.status ?? "pending",
    customerId: initialData?.customerId ?? "",
    objectId: initialData?.objectId ?? null,
    customerContactId: initialData?.customerContactId ?? null,
    orderType: initialData?.orderType ?? "one_time",
    recurringStartDate: initialData?.recurringStartDate ? new Date(initialData.recurringStartDate) : null,
    recurringEndDate: initialData?.recurringEndDate ? new Date(initialData.recurringEndDate) : null,
    priority: initialData?.priority ?? "low",
    totalEstimatedHours: (initialData?.totalEstimatedHours as number | null | undefined) ?? null,
    notes: initialData?.notes ?? null,
    serviceType: initialData?.serviceType ?? null,
    requestStatus: initialData?.requestStatus ?? "approved",
    assignedEmployees: (initialData?.assignedEmployees as OrderFormValues['assignedEmployees']) ?? [],
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema as z.ZodSchema<OrderFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const { fields: assignedEmployeeFields, replace: replaceAssignedEmployees, update: updateAssignedEmployee } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  
  // Watch assignedEmployees for real-time validation
  const watchedAssignedEmployees = form.watch("assignedEmployees");

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

      // Fetch daily_schedules as JSONB
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, daily_schedules, recurrence_interval_weeks, start_week_offset');
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesData) setAllEmployees(employeesData);
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
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

  useEffect(() => {
    if (!initialData) {
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name || '';
      const objectName = objects.find(o => o.id === selectedObjectId)?.name || '';
      const parts = [];
      if (objectName) parts.push(objectName);
      if (customerName) parts.push(customerName);
      const generatedTitle = parts.join(' • ');
      if (form.getValues("title") !== generatedTitle) {
        form.setValue("title", generatedTitle);
      }
    }
  }, [selectedCustomerId, selectedObjectId, customers, objects, form, initialData]);

  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  // Helper to parse daily schedules from JSON string
  const parseDailySchedules = (jsonString: string | null | undefined) => { // Added undefined
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Error parsing daily schedules JSON:", e);
      return [];
    }
  };

  // Effect to calculate total estimated hours based on assignments or object data
  useEffect(() => {
    const assignedEmployees = form.watch("assignedEmployees");
    const orderType = form.watch("orderType");
    const dueDate = form.watch("dueDate");
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);

    let newTotalEstimatedHours: number | null = null;

    if (assignedEmployees && assignedEmployees.length > 0) {
      // If employees are assigned, sum their hours
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        // Sum all hours for the week from assigned_daily_schedules
        newTotalEstimatedHours = assignedEmployees.reduce((total, emp) => {
          const schedules = parseDailySchedules(emp.assigned_daily_schedules);
          const weeklySum = schedules.reduce((dayTotal: number, schedule: any) => dayTotal + (schedule.hours || 0), 0);
          return total + weeklySum;
        }, 0);
      } else if (orderType === 'one_time' && dueDate) {
        // Sum hours for the specific due date
        const dayOfWeek = dueDate.getDay(); // 0=Sun, 1=Mon...
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // Adjust for dayNames array
        newTotalEstimatedHours = assignedEmployees.reduce((total, emp) => {
          const schedules = parseDailySchedules(emp.assigned_daily_schedules);
          const scheduleForDay = schedules.find((s: any) => s.day_of_week === dayKey && s.week_offset_in_cycle === 0); // Assuming 0 for one-time
          return total + (scheduleForDay?.hours || 0);
        }, 0);
      }
    } else if (selectedObject) {
      // Fallback to object hours if no employees are assigned
      const objectSchedules = parseDailySchedules(selectedObject.daily_schedules);
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        // Sum all hours for the week from object's daily_schedules (assuming week_offset_in_cycle 0 for total)
        newTotalEstimatedHours = objectSchedules.reduce((total: number, schedule: any) => {
          if (schedule.week_offset_in_cycle === 0) { // Sum only for the base week schedule
            return total + (schedule.hours || 0);
          }
          return total;
        }, 0);
      } else if (orderType === 'one_time' && dueDate) {
        const dayOfWeek = dueDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        const scheduleForDay = objectSchedules.find((s: any) => s.day_of_week === dayKey && s.week_offset_in_cycle === 0);
        newTotalEstimatedHours = scheduleForDay?.hours || null;
      }
    }

    const currentTotal = form.getValues("totalEstimatedHours");
    const safeNewTotal = (typeof newTotalEstimatedHours === 'number' && isFinite(newTotalEstimatedHours)) ? parseFloat(newTotalEstimatedHours.toFixed(2)) : null;
    
    if (currentTotal !== safeNewTotal) {
      form.setValue("totalEstimatedHours", safeNewTotal, { shouldValidate: false });
    }

  }, [watchedAssignedEmployees, orderType, form.watch("dueDate"), selectedObjectId, objects, form]);


  // EXACT LOGIC: Employee assignment distribution
  const handleEmployeeSelectionChange = useCallback((selectedIds: string[]) => {
    const currentObjectId = form.getValues("objectId") ?? null;
    const selectedObject = objects.find(obj => obj.id === currentObjectId);
    const numAssignedEmployees = selectedIds.length;

    if (!selectedObject) {
      replaceAssignedEmployees([]);
      return;
    }

    const currentAssignments = form.getValues("assignedEmployees") || [];
    const objectDailySchedules = parseDailySchedules(selectedObject.daily_schedules);

    const newAssignments = selectedIds.map(employeeId => {
      const existingAssignment = currentAssignments.find(emp => emp.employeeId === employeeId);
      
      // If employee already has an assignment, keep it.
      if (existingAssignment) {
        return existingAssignment;
      }

      // Otherwise, create a new blank assignment with default recurrence from object
      const newEmpData: AssignedEmployee = {
        employeeId,
        assigned_daily_schedules: '[]', // Default to empty JSON array string
        assigned_recurrence_interval_weeks: selectedObject.recurrence_interval_weeks,
        assigned_start_week_offset: selectedObject.start_week_offset,
      };

      // If only one employee, distribute object's daily schedules to them
      if (numAssignedEmployees === 1) {
        const distributedSchedules = objectDailySchedules.map((schedule: any) => ({
          ...schedule,
          hours: schedule.hours, // Keep original hours if only one employee
        }));
        newEmpData.assigned_daily_schedules = JSON.stringify(distributedSchedules);
      }

      return newEmpData;
    });

    // If multiple employees, distribute object hours equally among them
    if (numAssignedEmployees > 1) {
      const distributedAssignments = newAssignments.map(assignment => {
        const distributedSchedules = objectDailySchedules.map((schedule: any) => ({
          ...schedule,
          hours: (schedule.hours || 0) / numAssignedEmployees, // Distribute hours
        }));
        return {
          ...assignment,
          assigned_daily_schedules: JSON.stringify(distributedSchedules),
        };
      });
      replaceAssignedEmployees(distributedAssignments);
    } else {
      replaceAssignedEmployees(newAssignments);
    }
  }, [objects, form, replaceAssignedEmployees]);

  const handleAssignedSchedulesChange = useCallback((
    employeeIndex: number,
    value: string
  ) => {
    const fieldName = `assignedEmployees.${employeeIndex}.assigned_daily_schedules` as const;
    form.setValue(fieldName, value, { shouldValidate: true });
  }, [form]);

  const handleCopyDay = (employeeIndex: number, sourceDay: typeof dayNames[number], sourceWeekOffset: number) => {
    const currentAssignedSchedules = parseDailySchedules(form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules`) ?? '[]'); // Added ?? '[]'
    const sourceSchedule = currentAssignedSchedules.find((s: any) => s.day_of_week === sourceDay && s.week_offset_in_cycle === sourceWeekOffset);

    if (!sourceSchedule || sourceSchedule.hours === null || sourceSchedule.hours === 0) {
      toast.info("Keine Stunden zum Kopieren vorhanden.");
      return;
    }

    let copiedDaysCount = 0;
    const newSchedules = [...currentAssignedSchedules];
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    const objectDailySchedules = parseDailySchedules(selectedObject?.daily_schedules || '[]');

    dayNames.forEach(targetDay => {
      // Iterate through all possible week offsets for the target day
      for (let offset = 0; offset < (form.getValues(`assignedEmployees.${employeeIndex}.assigned_recurrence_interval_weeks`) || 1); offset++) {
        // Check if the target day/offset has hours defined in the object's base schedule
        const objectScheduleForTarget = objectDailySchedules.find((s: any) => s.day_of_week === targetDay && s.week_offset_in_cycle === offset);
        if (!objectScheduleForTarget || objectScheduleForTarget.hours === 0) continue; // Only copy to days/offsets that are actually scheduled in the object

        const existingTargetScheduleIndex = newSchedules.findIndex((s: any) => s.day_of_week === targetDay && s.week_offset_in_cycle === offset);

        if (existingTargetScheduleIndex === -1) {
          // Add new schedule entry
          newSchedules.push({
            ...sourceSchedule,
            day_of_week: targetDay,
            week_offset_in_cycle: offset,
          });
          copiedDaysCount++;
        } else if (targetDay !== sourceDay || offset !== sourceWeekOffset) {
          // Update existing schedule entry if it's a different day/offset
          newSchedules[existingTargetScheduleIndex] = {
            ...sourceSchedule,
            day_of_week: targetDay,
            week_offset_in_cycle: offset,
          };
          copiedDaysCount++;
        }
      }
    });

    form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules`, JSON.stringify(newSchedules), { shouldValidate: true });

    if (copiedDaysCount > 0) {
        toast.success(`Zeiten von ${germanDayNames[sourceDay]} (Woche ${sourceWeekOffset + 1}) wurden für ${copiedDaysCount} weitere Tage übernommen.`);
    } else {
        toast.info("Keine weiteren relevanten Tage zum Kopieren gefunden.");
    }
  };

  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    // Validate that assigned hours match object hours for each day and week_offset
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        const objectDailySchedules = parseDailySchedules(selectedObject.daily_schedules);
        let validationError = false;

        // Iterate through all possible day/week_offset combinations from the object's schedule
        objectDailySchedules.forEach((objSchedule: any) => {
          const objectDailyHours = objSchedule.hours;
          if (objectDailyHours === null || objectDailyHours === undefined || objectDailyHours === 0) return;

          let sumAssignedHoursForSlot = 0;
          data.assignedEmployees?.forEach(assignedEmp => {
            const assignedSchedules = parseDailySchedules(assignedEmp.assigned_daily_schedules ?? '[]'); // Added ?? '[]'
            const assignedScheduleForSlot = assignedSchedules.find((s: any) => 
              s.day_of_week === objSchedule.day_of_week && 
              s.week_offset_in_cycle === objSchedule.week_offset_in_cycle
            );
            sumAssignedHoursForSlot += (assignedScheduleForSlot?.hours || 0);
          });

          if (sumAssignedHoursForSlot > 0) {
            if (Math.abs(sumAssignedHoursForSlot - objectDailyHours) > 0.1) {
              form.setError(`assignedEmployees`, {
                type: "manual",
                message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[objSchedule.day_of_week]} (Woche ${objSchedule.week_offset_in_cycle + 1}) (${sumAssignedHoursForSlot.toFixed(2)} Std.) muss den Objektstunden (${objectDailyHours.toFixed(2)} Std.) entsprechen.`,
              });
              validationError = true;
            }
          }
        });
        if (validationError) {
          toast.error("Bitte korrigieren Sie die zugewiesenen Stunden pro Mitarbeiter.");
          return;
        }
      }
    }

    const result = await onSubmit(data);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
        form.setValue("assignedEmployees", []);
      }
      onSuccess?.();
    }
  };

  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result);
    if (result.success) {
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, daily_schedules, recurrence_interval_weeks, start_week_offset');
      if (newObjectsData) {
        setObjects(newObjectsData);
        const newObject = newObjectsData.find(obj => obj.name === data.name && obj.customer_id === data.customerId);
        if (newObject) {
          form.setValue("objectId", newObject.id);
        }
      }
      if (newObjectsError) console.error("Fehler beim Neuladen der Objekte:", newObjectsError);
      setIsNewObjectDialogOpen(false);
    }
    return result;
  };

  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId);
      form.setValue("customerContactId", newContactId);
    }
  };

  const getSumAssignedHoursForSlot = (day: string, weekOffset: number): number => {
    const currentAssignments = form.watch("assignedEmployees") || [];
    const sum = currentAssignments.reduce((total, emp) => {
      const schedules = parseDailySchedules(emp.assigned_daily_schedules ?? '[]'); // Added ?? '[]'
      const scheduleForSlot = schedules.find((s: any) => s.day_of_week === day && s.week_offset_in_cycle === weekOffset);
      return total + (scheduleForSlot?.hours || 0);
    }, 0);
    return typeof sum === 'number' && !isNaN(sum) ? sum : 0;
  };

  const getObjectDailyScheduleForSlot = (day: string, weekOffset: number): { hours: number | null; start_time: string | null; end_time: string | null } | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObject) return null;
    const objectSchedules = parseDailySchedules(selectedObject.daily_schedules);
    return objectSchedules.find((s: any) => s.day_of_week === day && s.week_offset_in_cycle === weekOffset) || null;
  };

  const isDailyHoursValidForSlot = (day: string, weekOffset: number): boolean => {
    const objectSchedule = getObjectDailyScheduleForSlot(day, weekOffset);
    const objectHours = objectSchedule?.hours;
    if (objectHours === null || objectHours === undefined || objectHours === 0) return true;
    const sumAssigned = getSumAssignedHoursForSlot(day, weekOffset);
    if (sumAssigned === 0) return true;
    return Math.abs(sumAssigned - objectHours) <= 0.1;
  };

  const selectedObject = objects.find(obj => obj.id === selectedObjectId);
  const objectRecurrenceIntervalWeeks = selectedObject?.recurrence_interval_weeks || 1;
  const objectDailySchedules = parseDailySchedules(selectedObject?.daily_schedules || '[]');

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
      <div>
        <Label htmlFor="title">Titel des Auftrags</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Wird automatisch generiert"
          disabled={!initialData}
        />
        {form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Details zum Auftrag..."
          rows={4}
        />
        {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="serviceType">Reinigungsdienstleistung</Label>
        <Select onValueChange={(value: string) => form.setValue("serviceType", value as OrderFormValues["serviceType"])} value={form.watch("serviceType") || ""}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Dienstleistung auswählen" />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.serviceType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select onValueChange={(value: string) => {
          form.setValue("customerId", value);
          form.setValue("objectId", null);
          form.setValue("customerContactId", null);
          // Clear employee assignments when customer changes
          replaceAssignedEmployees([]);
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
          <Label htmlFor="customerContactId">Auftraggebende Person (Kundenkontakt, optional)</Label>
          <Select onValueChange={(value: string) => form.setValue("customerContactId", value === "unassigned" ? null : value)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kundenkontakt auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
              {customerContacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.customerContactId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>}
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>
      
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value: string) => {
            form.setValue("objectId", value);
            // Clear employee assignments when object changes
            replaceAssignedEmployees([]);
          }} value={form.watch("objectId") || "unassigned"} disabled={!form.watch("customerId")}>
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
          {form.formState.errors.objectId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>}
        </div>
        <Dialog open={isNewObjectDialogOpen} onOpenChange={setIsNewObjectDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-1"
              disabled={!form.watch("customerId")}
              title={!form.watch("customerId") ? "Bitte zuerst einen Kunden auswählen" : "Neues Objekt für diesen Kunden erstellen"}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" aria-labelledby="object-create-dialog-title">
            <DialogHeader>
              <DialogTitle id="object-create-dialog-title">Neues Objekt erstellen</DialogTitle>
            </DialogHeader>
            <ObjectForm
              initialData={{ customerId: form.watch("customerId") }}
              onSubmit={handleCreateObject}
              submitButtonText="Objekt erstellen"
              onSuccess={() => setIsNewObjectDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* MOVED: Order Type before Employee Assignment */}
      <div>
        <Label htmlFor="orderType">Auftragstyp</Label>
        <Select onValueChange={(value: OrderFormValues["orderType"]) => {
          form.setValue("orderType", value);
          form.setValue("dueDate", null);
          form.setValue("recurringStartDate", null);
          form.setValue("recurringEndDate", null);
        }} value={form.watch("orderType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftragstyp auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">Einmalig</SelectItem>
            <SelectItem value="recurring">Wiederkehrend</SelectItem>
            <SelectItem value="substitution">Vertretung</SelectItem>
            <SelectItem value="permanent">Permanent</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.orderType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>}
      </div>

      {orderType === "one_time" && (
        <DatePicker
          label="Fälligkeitsdatum (optional)"
          value={form.watch("dueDate")}
          onChange={(date: Date | null) => form.setValue("dueDate", date)}
          error={form.formState.errors.dueDate?.message}
        />
      )}
      
      {(orderType === "recurring" || orderType === "substitution" || orderType === "permanent") && (
        <>
          <DatePicker
            label="Startdatum"
            value={form.watch("recurringStartDate")}
            onChange={(date: Date | null) => form.setValue("recurringStartDate", date)}
            error={form.formState.errors.recurringStartDate?.message}
          />
          {orderType !== "permanent" && (
            <DatePicker
              label="Enddatum (optional)"
              value={form.watch("recurringEndDate")}
              onChange={(date: Date | null) => form.setValue("recurringEndDate", date)}
              error={form.formState.errors.recurringEndDate?.message}
            />
          )}
        </>
      )}
      
      {/* ENHANCED: Employee Assignment Section with Object Hours Distribution */}
      <div className="space-y-4">
        <Label>Zugewiesene Mitarbeiter (optional)</Label>
        <MultiSelectEmployees
          employees={allEmployees}
          selectedEmployeeIds={assignedEmployeeFields.map(emp => emp.employeeId)}
          onSelectionChange={handleEmployeeSelectionChange}
          disabled={!selectedObjectId}
        />
        {form.formState.errors.assignedEmployees && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees.message}</p>
        )}
        {!selectedObjectId && (
            <p className="text-muted-foreground text-sm mt-1">Bitte wählen Sie zuerst ein Objekt aus, um Mitarbeiter zuzuweisen.</p>
        )}
        
        {/* ENHANCED: Detailed Employee Assignment Grid */}
        {assignedEmployeeFields.length > 0 && (
          <div className="mt-4 space-y-4">
            <h3 className="text-lg font-semibold">Arbeitszeiten pro Mitarbeiter</h3>
            {assignedEmployeeFields.map((assignedEmp, assignedIndex) => (
              <div key={assignedEmp.employeeId} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-base">
                    {allEmployees.find(emp => emp.id === assignedEmp.employeeId)?.first_name}{' '}
                    {allEmployees.find(emp => emp.id === assignedEmp.employeeId)?.last_name}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newSelectedIds = assignedEmployeeFields.filter(emp => emp.employeeId !== assignedEmp.employeeId).map(emp => emp.employeeId);
                      handleEmployeeSelectionChange(newSelectedIds);
                    }}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Wiederholungsintervall für Mitarbeiter</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`}>Wiederholt sich alle X Wochen</Label>
                      <Input
                        id={`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`}
                        type="number"
                        step="1"
                        min="1"
                        max="52"
                        {...form.register(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`, { valueAsNumber: true })}
                        placeholder="Z.B. 1 für jede Woche, 2 für jede zweite Woche"
                      />
                      {form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_recurrence_interval_weeks?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}>Start-Wochen-Offset (0-basierend)</Label>
                      <Input
                        id={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}
                        type="number"
                        step="1"
                        min="0"
                        max={form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) - 1}
                        {...form.register(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`, { valueAsNumber: true })}
                        placeholder="Z.B. 0 für die erste Woche, 1 für die zweite Woche"
                      />
                      {form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_start_week_offset && <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_start_week_offset?.message}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten für diesen Mitarbeiter gelten.
                    Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
                  </p>
                </div>
                
                {/* Daily Schedules JSON Textarea */}
                <div className="space-y-2">
                  <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_daily_schedules`} className="text-xs">Zugewiesene tägliche Zeitpläne (JSON)</Label>
                  <p className="text-sm text-muted-foreground">
                    Geben Sie die Zeitpläne als JSON-Array ein. Beispiel:
                    `&#91;{&#34;day_of_week&#34;: &#34;monday&#34;, &#34;week_offset_in_cycle&#34;: 0, &#34;hours&#34;: 4, &#34;start_time&#34;: &#34;08:00&#34;, &#34;end_time&#34;: &#34;12:00&#34;}]`
                  </p>
                  <Textarea
                    id={`assignedEmployees.${assignedIndex}.assigned_daily_schedules`}
                    {...form.register(`assignedEmployees.${assignedIndex}.assigned_daily_schedules`)}
                    placeholder="[{'day_of_week': 'monday', 'week_offset_in_cycle': 0, 'hours': 4, 'start_time': '08:00', 'end_time': '12:00'}]"
                    rows={5}
                    className="font-mono text-xs"
                    onChange={(e) => handleAssignedSchedulesChange(assignedIndex, e.target.value)}
                  />
                  {form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_daily_schedules && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees?.[assignedIndex]?.assigned_daily_schedules?.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select onValueChange={(value: OrderFormValues["priority"]) => form.setValue("priority", value)} value={form.watch("priority")}>
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
        <Label htmlFor="totalEstimatedHours">Geschätzte Stunden (automatisch berechnet)</Label>
        <Input
          id="totalEstimatedHours"
          type="number"
          step="0.01"
          {...form.register("totalEstimatedHours")}
          placeholder="Wird automatisch berechnet"
          readOnly
          className="bg-muted cursor-not-allowed"
        />
        {form.formState.errors.totalEstimatedHours && <p className="text-red-500 text-sm mt-1">{form.formState.errors.totalEstimatedHours.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche Notizen zum Auftrag..."
          rows={3}
        />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value: OrderFormValues["status"]) => form.setValue("status", value)} value={form.watch("status")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="requestStatus">Anfragestatus</Label>
        <Select onValueChange={(value: OrderFormValues["requestStatus"]) => form.setValue("requestStatus", value)} value={form.watch("requestStatus")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Anfragestatus auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.requestStatus && <p className="text-red-500 text-sm mt-1">{form.formState.errors.requestStatus.message}</p>}
      </div>
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}