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
  assigned_monday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_tuesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_wednesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_thursday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_friday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_saturday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_sunday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_monday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_monday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_tuesday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_tuesday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_wednesday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_wednesday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_thursday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_thursday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_friday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_friday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_saturday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_saturday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_sunday_start_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  assigned_sunday_end_time: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
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
    monday_hours: number | null;
    tuesday_hours: number | null;
    wednesday_hours: number | null;
    thursday_hours: number | null;
    friday_hours: number | null;
    saturday_hours: number | null;
    sunday_hours: number | null;
    monday_start_time: string | null;
    tuesday_start_time: string | null;
    wednesday_start_time: string | null;
    thursday_start_time: string | null;
    friday_start_time: string | null;
    saturday_start_time: string | null;
    sunday_start_time: string | null;
    monday_end_time: string | null;
    tuesday_end_time: string | null;
    wednesday_end_time: string | null;
    thursday_end_time: string | null;
    friday_end_time: string | null;
    saturday_end_time: string | null;
    sunday_end_time: string | null;
    total_weekly_hours: number | null;
    time_of_day: string | null;
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

      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time, total_weekly_hours, time_of_day');
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
        // Sum all hours for the week
        newTotalEstimatedHours = assignedEmployees.reduce((total, emp) => {
          const weeklySum = dayNames.reduce((dayTotal, day) => {
            const hours = emp[`assigned_${day}_hours` as keyof typeof emp] as number | null;
            return dayTotal + (hours || 0);
          }, 0);
          return total + weeklySum;
        }, 0);
      } else if (orderType === 'one_time' && dueDate) {
        // Sum hours for the specific due date
        const dayOfWeek = dueDate.getDay(); // 0=Sun, 1=Mon...
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // Adjust for dayNames array
        newTotalEstimatedHours = assignedEmployees.reduce((total, emp) => {
          const hours = emp[`assigned_${dayKey}_hours` as keyof typeof emp] as number | null;
          return total + (hours || 0);
        }, 0);
      }
    } else if (selectedObject) {
      // Fallback to object hours if no employees are assigned
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        newTotalEstimatedHours = selectedObject.total_weekly_hours || null;
      } else if (orderType === 'one_time' && dueDate) {
        const dayOfWeek = dueDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        newTotalEstimatedHours = selectedObject[`${dayKey}_hours` as keyof typeof selectedObject] as number | null;
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

    const newAssignments = selectedIds.map(employeeId => {
      const existingAssignment = currentAssignments.find(emp => emp.employeeId === employeeId);
      
      // If employee already has an assignment, keep it.
      if (existingAssignment) {
        return existingAssignment;
      }

      // Otherwise, create a new blank assignment with 0 hours but default start times.
      const newEmpData: AssignedEmployee = {
        employeeId,
        assigned_monday_hours: null, assigned_tuesday_hours: null, assigned_wednesday_hours: null,
        assigned_thursday_hours: null, assigned_friday_hours: null, assigned_saturday_hours: null,
        assigned_sunday_hours: null,
        assigned_monday_start_time: null, assigned_monday_end_time: null,
        assigned_tuesday_start_time: null, assigned_tuesday_end_time: null,
        assigned_wednesday_start_time: null, assigned_wednesday_end_time: null,
        assigned_thursday_start_time: null, assigned_thursday_end_time: null,
        assigned_friday_start_time: null, assigned_friday_end_time: null,
        assigned_saturday_start_time: null, assigned_saturday_end_time: null,
        assigned_sunday_start_time: null, assigned_sunday_end_time: null,
      };

      dayNames.forEach(day => {
        const objectStartTime = selectedObject?.[`${day}_start_time` as keyof typeof selectedObject] as string | null;
        (newEmpData as any)[`assigned_${day}_start_time`] = objectStartTime;
      });

      return newEmpData;
    });

    // If there's now only one employee, give them all the hours.
    if (numAssignedEmployees === 1 && newAssignments.length === 1) {
      const singleAssignment = newAssignments[0];
      dayNames.forEach(day => {
        const objectDailyHours = selectedObject?.[`${day}_hours` as keyof typeof selectedObject] as number | null;
        const objectStartTime = selectedObject?.[`${day}_start_time` as keyof typeof selectedObject] as string | null;
        
        (singleAssignment as any)[`assigned_${day}_hours`] = objectDailyHours;
        (singleAssignment as any)[`assigned_${day}_start_time`] = objectStartTime;
        
        if (objectStartTime && objectDailyHours) {
          (singleAssignment as any)[`assigned_${day}_end_time`] = calculateEndTime(objectStartTime, objectDailyHours);
        }
      });
    }

    replaceAssignedEmployees(newAssignments);
  }, [objects, form, replaceAssignedEmployees]);

  const handleAssignedHoursChange = useCallback((
    employeeIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const parsedHours = value === "" ? null : Number(value);
    const hoursFieldName = `assignedEmployees.${employeeIndex}.assigned_${day}_hours` as const;
    form.setValue(hoursFieldName, parsedHours, { shouldValidate: true });

    let startTime = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${day}_start_time`);
    
    // **NEW LOGIC**: If start time is empty but we now have hours, populate it.
    if (parsedHours != null && parsedHours > 0 && !startTime) {
      const selectedObject = objects.find(obj => obj.id === selectedObjectId);
      const objectStartTime = selectedObject?.[`${day}_start_time` as keyof typeof selectedObject] as string | null;
      if (objectStartTime) {
        startTime = objectStartTime;
        form.setValue(`assignedEmployees.${employeeIndex}.assigned_${day}_start_time`, startTime, { shouldValidate: false }); // Set it without re-triggering validation yet
      }
    }

    let newEndTime: string | null = null;
    if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
      newEndTime = calculateEndTime(startTime, parsedHours);
    }
    form.setValue(`assignedEmployees.${employeeIndex}.assigned_${day}_end_time`, newEndTime, { shouldValidate: true });
  }, [form, objects, selectedObjectId]);

  const handleAssignedStartTimeChange = useCallback((
    employeeIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const startTimeFieldName = `assignedEmployees.${employeeIndex}.assigned_${day}_start_time` as const;
    const endTimeFieldName = `assignedEmployees.${employeeIndex}.assigned_${day}_end_time` as const;
    const hours = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${day}_hours`);

    form.setValue(startTimeFieldName, value || null, { shouldValidate: true });
    
    let newEndTime: string | null = null;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      newEndTime = calculateEndTime(value, hours);
    }
    form.setValue(endTimeFieldName, newEndTime, { shouldValidate: true });
  }, [form]);

  const handleAssignedEndTimeChange = useCallback((
    employeeIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const endTimeFieldName = `assignedEmployees.${employeeIndex}.assigned_${day}_end_time` as const;
    const startTimeFieldName = `assignedEmployees.${employeeIndex}.assigned_${day}_start_time` as const;
    const hours = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${day}_hours`);

    form.setValue(endTimeFieldName, value || null, { shouldValidate: true });

    let newStartTime: string | null = null;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      newStartTime = calculateStartTime(value, hours);
    }
    form.setValue(startTimeFieldName, newStartTime, { shouldValidate: true });
  }, [form]);

  const handleCopyDay = (employeeIndex: number, sourceDay: typeof dayNames[number]) => {
    const sourceHours = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${sourceDay}_hours`);
    const sourceStartTime = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${sourceDay}_start_time`);
    const sourceEndTime = form.getValues(`assignedEmployees.${employeeIndex}.assigned_${sourceDay}_end_time`);

    if (sourceHours === null || sourceHours === 0) {
      toast.info("Keine Stunden zum Kopieren vorhanden.");
      return;
    }

    let copiedDaysCount = 0;
    dayNames.forEach(targetDay => {
      if (targetDay !== sourceDay) {
        // NEW CHECK: Only copy if the target day has hours defined in the object.
        const objectHoursForTargetDay = getObjectDailyHours(targetDay);
        if (objectHoursForTargetDay && objectHoursForTargetDay > 0) {
          form.setValue(`assignedEmployees.${employeeIndex}.assigned_${targetDay}_hours`, sourceHours, { shouldValidate: true });
          form.setValue(`assignedEmployees.${employeeIndex}.assigned_${targetDay}_start_time`, sourceStartTime, { shouldValidate: true });
          form.setValue(`assignedEmployees.${employeeIndex}.assigned_${targetDay}_end_time`, sourceEndTime, { shouldValidate: true });
          copiedDaysCount++;
        }
      }
    });

    if (copiedDaysCount > 0) {
        toast.success(`Zeiten von ${germanDayNames[sourceDay]} wurden für ${copiedDaysCount} weitere Tage übernommen.`);
    } else {
        toast.info("Keine weiteren relevanten Tage zum Kopieren gefunden.");
    }
  };

  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    // Validate that assigned hours match object hours for each day
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        let validationError = false;
        dayNames.forEach(day => {
          const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
          // Skip validation for days with no object hours
          if (objectDailyHours === null || objectDailyHours === undefined || objectDailyHours === 0) return;

          // Calculate sum using the actual form data being submitted
          let sumAssignedHoursForDay = 0;
          data.assignedEmployees?.forEach(assignedEmp => {
            const assignedHours = (assignedEmp as any)[`assigned_${day}_hours`] as number | null;
            sumAssignedHoursForDay += (assignedHours || 0);
          });

          // Only validate if there are actually assigned hours for this day
          if (sumAssignedHoursForDay > 0) {
            // Use a more lenient tolerance for floating point comparison
            if (Math.abs(sumAssignedHoursForDay - objectDailyHours) > 0.1) {
              form.setError(`assignedEmployees`, {
                type: "manual",
                message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[day]} (${sumAssignedHoursForDay.toFixed(2)} Std.) muss den Objektstunden (${objectDailyHours.toFixed(2)} Std.) entsprechen.`,
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
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, total_weekly_hours, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time, time_of_day');
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

  // FIXED: Use watch() to get real-time form values
  const getSumAssignedHoursForDay = (day: string): number => {
    const currentAssignments = form.watch("assignedEmployees") || [];
    const sum = currentAssignments.reduce((total, emp) => {
      const assignedHours = (emp as any)[`assigned_${day}_hours`] as number | null;
      return total + (assignedHours || 0);
    }, 0);
    // Ensure we always return a valid number
    return typeof sum === 'number' && !isNaN(sum) ? sum : 0;
  };

  const getObjectDailyHours = (day: string): number | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    return selectedObject ? (selectedObject[`${day}_hours` as keyof typeof selectedObject] as number || null) : null;
  };

  const isDailyHoursValid = (day: string): boolean => {
    const objectHours = getObjectDailyHours(day);
    if (objectHours === null || objectHours === 0) return true;
    const sumAssigned = getSumAssignedHoursForDay(day);
    // Only validate if there are actually assigned hours
    if (sumAssigned === 0) return true;
    return Math.abs(sumAssigned - objectHours) <= 0.1;
  };

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
                
                {/* Daily Hours and Times Grid - RESTRUCTURED */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {dayNames.map(day => {
                    const hoursFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_hours` as const;
                    const startFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_start_time` as const;
                    const endFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_end_time` as const;
                    const objectDailyHours = getObjectDailyHours(day);
                    const isDayValid = isDailyHoursValid(day);
                    const sumAssignedForDay = getSumAssignedHoursForDay(day);

                    // Only show days that have object hours
                    if (!objectDailyHours || objectDailyHours === 0) return null;

                    return (
                      <div key={day} className={cn(
                        "border p-3 rounded-md space-y-2",
                        !isDayValid && "border-destructive bg-destructive/5"
                      )}>
                        <h5 className="font-medium text-sm flex items-center justify-between">
                          {germanDayNames[day]}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-primary"
                                  onClick={() => handleCopyDay(assignedIndex, day)}
                                  disabled={!watchedAssignedEmployees?.[assignedIndex]?.[`assigned_${day}_hours`]}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Zeiten für alle anderen Tage übernehmen</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </h5>
                        
                        {/* 1. Arbeitsstunden (oben) */}
                        <Controller
                          name={hoursFieldName}
                          control={form.control}
                          render={({ field }) => (
                            <div>
                              <Label htmlFor={field.name} className="text-xs">Arbeitsstunden</Label>
                              <Input
                                {...field}
                                id={field.name}
                                type="number"
                                step="0.5"
                                min="0"
                                max={objectDailyHours ?? undefined}
                                placeholder="Std."
                                className={cn(
                                  "w-full text-sm",
                                  !isDayValid && "border-destructive focus-visible:ring-destructive"
                                )}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value === '' ? null : Number(e.target.value));
                                  handleAssignedHoursChange(assignedIndex, day, e.target.value);
                                }}
                              />
                            </div>
                          )}
                        />
                        
                        {/* 2. Startzeit (mitte) */}
                        <Controller
                          name={startFieldName}
                          control={form.control}
                          render={({ field }) => (
                            <div>
                              <Label htmlFor={field.name} className="text-xs">Startzeit</Label>
                              <Input
                                {...field}
                                id={field.name}
                                type="time"
                                className="w-full text-sm"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  handleAssignedStartTimeChange(assignedIndex, day, e.target.value);
                                }}
                              />
                            </div>
                          )}
                        />
                        
                        {/* 3. Endzeit (unten, jetzt bearbeitbar) */}
                        <Controller
                          name={endFieldName}
                          control={form.control}
                          render={({ field }) => (
                            <div>
                              <Label htmlFor={field.name} className="text-xs">Endzeit</Label>
                              <Input
                                {...field}
                                id={field.name}
                                type="time"
                                className="w-full text-sm"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  handleAssignedEndTimeChange(assignedIndex, day, e.target.value);
                                }}
                              />
                            </div>
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Validation Summary for this Employee */}
                {dayNames.some(day => !isDailyHoursValid(day) && getObjectDailyHours(day)) && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                    ⚠️ Die Summe der zugewiesenen Stunden muss für jeden Tag den Objektstunden entsprechen.
                  </div>
                )}
              </div>
            ))}
            
            {/* Object Hours Overview */}
            {selectedObjectId && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Objektarbeitszeiten Übersicht</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {dayNames.map(day => {
                    const objectDayHours = getObjectDailyHours(day);
                    const totalAssigned = getSumAssignedHoursForDay(day);
                    
                    if (!objectDayHours || objectDayHours === 0) return null;
                    
                    return (
                      <div key={day} className="flex justify-between">
                        <span>{germanDayNames[day]}:</span>
                        <span className={cn(
                          "font-medium",
                          Math.abs(totalAssigned - objectDayHours) > 0.1 ? 'text-destructive' : 'text-success'
                        )}>
                          {totalAssigned.toFixed(1)}h / {objectDayHours.toFixed(1)}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
          step="0.5"
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