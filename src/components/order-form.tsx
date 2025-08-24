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
import { getWeek } from 'date-fns'; // Import getWeek

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

const dailyScheduleSchema = z.object({
  hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  start: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
  end: z.string().regex(timeRegex, "Ungültiges Format").optional().nullable(),
});

const weeklyScheduleSchema = z.object({
  monday: dailyScheduleSchema.optional(),
  tuesday: dailyScheduleSchema.optional(),
  wednesday: dailyScheduleSchema.optional(),
  thursday: dailyScheduleSchema.optional(),
  friday: dailyScheduleSchema.optional(),
  saturday: dailyScheduleSchema.optional(),
  sunday: dailyScheduleSchema.optional(),
});

const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_daily_schedules: z.array(weeklyScheduleSchema).default([]),
  assigned_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  assigned_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
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
}).superRefine((data, ctx) => {
  if (data.assignedEmployees && data.objectId) {
    const selectedObject = (ctx.parent as any).objects?.find((obj: any) => obj.id === data.objectId);
    if (selectedObject) {
      data.assignedEmployees.forEach((assignedEmp, empIndex) => {
        if (assignedEmp.assigned_daily_schedules.length !== assignedEmp.assigned_recurrence_interval_weeks) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Die Anzahl der Wochenpläne für Mitarbeiter ${assignedEmp.employeeId} muss dem Wiederholungsintervall (${assignedEmp.assigned_recurrence_interval_weeks}) entsprechen.`,
            path: [`assignedEmployees.${empIndex}.assigned_daily_schedules`],
          });
        }

        assignedEmp.assigned_daily_schedules.forEach((weekSchedule, weekIndex) => {
          dayNames.forEach(day => {
            const objectDailyHours = (selectedObject.daily_schedules?.[weekIndex] as any)?.[day]?.hours;
            const assignedHours = (weekSchedule as any)?.[day]?.hours;

            if (objectDailyHours !== undefined && objectDailyHours !== null && objectDailyHours > 0) {
              if (assignedHours === undefined || assignedHours === null || assignedHours === 0) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Stunden für ${germanDayNames[day]} in Woche ${weekIndex + 1} müssen zugewiesen werden, da Objektstunden vorhanden sind.`,
                  path: [`assignedEmployees.${empIndex}.assigned_daily_schedules.${weekIndex}.${day}.hours`],
                });
              } else if (Math.abs(assignedHours - objectDailyHours) > 0.1) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Stunden für ${germanDayNames[day]} in Woche ${weekIndex + 1} (${assignedHours.toFixed(2)} Std.) müssen den Objektstunden (${objectDailyHours.toFixed(2)} Std.) entsprechen.`,
                  path: [`assignedEmployees.${empIndex}.assigned_daily_schedules.${weekIndex}.${day}.hours`],
                });
              }
            }
          });
        });
      });
    }
  }
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
  const [objects, setObjects] = useState<any[]>([]); // Keep as any[] for now, detailed type not needed here
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
    resolver: zodResolver(orderSchema.superRefine((data, ctx) => {
      // Pass objects to the superRefine context for validation
      (ctx as any).parent = { objects };
    }) as z.ZodSchema<OrderFormValues>),
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

      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, recurrence_interval_weeks, start_week_offset, daily_schedules');
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
        // Sum all hours for the week, considering recurrence
        newTotalEstimatedHours = assignedEmployees.reduce((total: number, emp: AssignedEmployee) => {
          const employeeRecurrenceInterval = emp.assigned_recurrence_interval_weeks;
          const employeeSchedules = emp.assigned_daily_schedules;
          
          if (employeeRecurrenceInterval > 0 && employeeSchedules.length === employeeRecurrenceInterval) {
            const totalHoursInCycle = employeeSchedules.reduce((cycleTotal: number, weekSchedule: any) => {
              return cycleTotal + dayNames.reduce((weekSum: number, day) => {
                const dailyHours = (weekSchedule as any)[day]?.hours;
                return weekSum + (dailyHours || 0);
              }, 0);
            }, 0);
            return total + (totalHoursInCycle / employeeRecurrenceInterval); // Average weekly hours
          }
          return total;
        }, 0);
      } else if (orderType === 'one_time' && dueDate) {
        // Sum hours for the specific due date
        const dayOfWeek = dueDate.getDay(); // 0=Sun, 1=Mon...
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // Adjust for dayNames array
        newTotalEstimatedHours = assignedEmployees.reduce((total: number, emp: AssignedEmployee) => {
          const employeeRecurrenceInterval = emp.assigned_recurrence_interval_weeks;
          const employeeSchedules = emp.assigned_daily_schedules;
          const startWeekNumber = getWeek(dueDate, { weekStartsOn: 1 });
          const weekOffset = (startWeekNumber - (emp.assigned_start_week_offset || 0)) % employeeRecurrenceInterval;
          const currentWeekSchedule = employeeSchedules[weekOffset < 0 ? weekOffset + employeeRecurrenceInterval : weekOffset];

          const hours = (currentWeekSchedule as any)?.[dayKey]?.hours;
          return total + (hours || 0);
        }, 0);
      }
    } else if (selectedObject) {
      // Fallback to object hours if no employees are assigned
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        const objectRecurrenceInterval = selectedObject.recurrence_interval_weeks;
        const objectSchedules = selectedObject.daily_schedules;

        if (objectRecurrenceInterval > 0 && objectSchedules.length === objectRecurrenceInterval) {
          const totalHoursInCycle = objectSchedules.reduce((cycleTotal: number, weekSchedule: any) => {
            return cycleTotal + dayNames.reduce((weekSum: number, day) => {
              const dailyHours = (weekSchedule as any)[day]?.hours;
              return weekSum + (dailyHours || 0);
            }, 0);
          }, 0);
          newTotalEstimatedHours = (totalHoursInCycle / objectRecurrenceInterval); // Average weekly hours
        }
      } else if (orderType === 'one_time' && dueDate) {
        const dayOfWeek = dueDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        const objectRecurrenceInterval = selectedObject.recurrence_interval_weeks;
        const objectSchedules = selectedObject.daily_schedules;
        const startWeekNumber = getWeek(dueDate, { weekStartsOn: 1 });
        const weekOffset = (startWeekNumber - (selectedObject.start_week_offset || 0)) % objectRecurrenceInterval;
        const currentWeekSchedule = objectSchedules[weekOffset < 0 ? weekOffset + objectRecurrenceInterval : weekOffset];
        
        newTotalEstimatedHours = (currentWeekSchedule as any)?.[dayKey]?.hours || null;
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
      const existingAssignment = currentAssignments.find((emp: AssignedEmployee) => emp.employeeId === employeeId);
      
      // If employee already has an assignment, keep it.
      if (existingAssignment) {
        return existingAssignment;
      }

      // Otherwise, create a new blank assignment with default recurrence and empty schedules.
      const newEmpData: AssignedEmployee = {
        employeeId,
        assigned_daily_schedules: [],
        assigned_recurrence_interval_weeks: selectedObject.recurrence_interval_weeks,
        assigned_start_week_offset: selectedObject.start_week_offset,
      };

      // Initialize assigned_daily_schedules based on object's recurrence interval
      for (let i = 0; i < selectedObject.recurrence_interval_weeks; i++) {
        const newWeekSchedule: z.infer<typeof weeklyScheduleSchema> = {};
        dayNames.forEach(day => {
          const objectDailySchedule = (selectedObject.daily_schedules?.[i] as any)?.[day];
          if (objectDailySchedule) {
            // Distribute object hours equally among selected employees
            const hoursPerEmployee = objectDailySchedule.hours && numAssignedEmployees > 0 
              ? objectDailySchedule.hours / numAss AssignedEmployees.length;
            
            newWeekSchedule[day] = {
              hours: hoursPerEmployee ? parseFloat(hoursPerEmployee.toFixed(2)) : null,
              start: objectDailySchedule.start,
              end: hoursPerEmployee && objectDailySchedule.start 
                ? calculateEndTime(objectDailySchedule.start, hoursPerEmployee) 
                : null,
            };
          }
        });
        newEmpData.assigned_daily_schedules.push(newWeekSchedule);
      }

      return newEmpData;
    });

    replaceAssignedEmployees(newAssignments);
  }, [objects, form, replaceAssignedEmployees]);

  const handleAssignedDailyHoursChange = useCallback((
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const parsedHours = value === "" ? null : Number(value);
    const currentSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, hours: parsedHours }, { shouldValidate: true });

    const startTime = currentSchedule.start;
    if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(startTime, parsedHours), { shouldValidate: true });
    } else {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleAssignedStartTimeChange = useCallback((
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, start: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.end`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleAssignedEndTimeChange = useCallback((
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => {
    const currentSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, end: value || null }, { shouldValidate: true });

    const hours = currentSchedule.hours;
    if (hours != null && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.start`, calculateStartTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.start`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleCopyDayToAllWeeksForEmployee = (employeeIndex: number, sourceWeekIndex: number, sourceDay: typeof dayNames[number]) => {
    const sourceSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${sourceWeekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.");
      return;
    }

    const employeeRecurrenceInterval = form.getValues(`assignedEmployees.${employeeIndex}.assigned_recurrence_interval_weeks`);
    let copiedCount = 0;
    for (let weekIndex = 0; weekIndex < employeeRecurrenceInterval; weekIndex++) {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${sourceDay}`, sourceSchedule, { shouldValidate: true });
        copiedCount++;
      }
    }
    if (copiedCount > 0) {
      toast.success(`Zeiten für ${germanDayNames[sourceDay]} wurden in ${copiedCount} weitere Wochen für diesen Mitarbeiter kopiert.`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  const handleCopyWeekToAllWeeksForEmployee = (employeeIndex: number, sourceWeekIndex: number) => {
    const sourceWeekSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${sourceWeekIndex}`);
    if (!sourceWeekSchedule || Object.keys(sourceWeekSchedule).length === 0) {
      toast.info("Kein Wochenplan zum Kopieren vorhanden.");
      return;
    }

    const employeeRecurrenceInterval = form.getValues(`assignedEmployees.${employeeIndex}.assigned_recurrence_interval_weeks`);
    let copiedCount = 0;
    for (let weekIndex = 0; weekIndex < employeeRecurrenceInterval; weekIndex++) {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}`, sourceWeekSchedule, { shouldValidate: true });
        copiedCount++;
      }
    }
    if (copiedCount > 0) {
      toast.success(`Wochenplan von Woche ${sourceWeekIndex + 1} wurde in ${copiedCount} weitere Wochen für diesen Mitarbeiter kopiert.`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    // Validate that assigned hours match object hours for each day
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        let validationError = false;
        // Iterate through all weeks in the object's recurrence cycle
        for (let weekIndex = 0; weekIndex < selectedObject.recurrence_interval_weeks; weekIndex++) {
          dayNames.forEach(day => {
            const objectDailyHours = (selectedObject.daily_schedules?.[weekIndex] as any)?.[day]?.hours;
            // Skip validation for days with no object hours
            if (objectDailyHours === null || objectDailyHours === undefined || objectDailyHours === 0) return;

            // Calculate sum using the actual form data being submitted
            let sumAssignedHoursForDay = 0;
            data.assignedEmployees?.forEach((assignedEmp: AssignedEmployee) => {
              const assignedHours = (assignedEmp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
              sumAssignedHoursForDay += (assignedHours || 0);
            });

            // Only validate if there are actually assigned hours for this day
            if (sumAssignedHoursForDay > 0) {
              // Use a more lenient tolerance for floating point comparison
              if (Math.abs(sumAssignedHoursForDay - objectDailyHours) > 0.1) {
                form.setError(`assignedEmployees`, {
                  type: "manual",
                  message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[day]} in Woche ${weekIndex + 1} (${sumAssignedHoursForDay.toFixed(2)} Std.) muss den Objektstunden (${objectDailyHours.toFixed(2)} Std.) entsprechen.`,
                });
                validationError = true;
              }
            }
          });
        }
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
        replaceAssignedEmployees([]);
      }
      onSuccess?.();
    }
  };

  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result);
    if (result.success) {
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, recurrence_interval_weeks, start_week_offset, daily_schedules');
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

  const getObjectDailyHours = (weekIndex: number, day: typeof dayNames[number]): number | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    return (selectedObject?.daily_schedules?.[weekIndex] as any)?.[day]?.hours || null;
  };

  const getSumAssignedHoursForDay = (weekIndex: number, day: typeof dayNames[number]): number => {
    const currentAssignments = form.watch("assignedEmployees") || [];
    const sum = currentAssignments.reduce((total: number, emp: AssignedEmployee) => {
      const assignedHours = (emp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
      return total + (assignedHours || 0);
    }, 0);
    return typeof sum === 'number' && !isNaN(sum) ? sum : 0;
  };

  const isDailyHoursValid = (weekIndex: number, day: typeof dayNames[number]): boolean => {
    const objectHours = getObjectDailyHours(weekIndex, day);
    if (objectHours === null || objectHours === 0) return true;
    const sumAssigned = getSumAssignedHoursForDay(weekIndex, day);
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
          selectedEmployeeIds={assignedEmployeeFields.map((emp: AssignedEmployee) => emp.employeeId)}
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
            {(form.formState.errors as any).assignedEmployees && <p className="text-red-500 text-sm mt-1">{(form.formState.errors as any).assignedEmployees.message}</p>}
            {assignedEmployeeFields.map((assignedEmp: AssignedEmployee, assignedIndex: number) => (
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
                      const newSelectedIds = assignedEmployeeFields.filter((emp: AssignedEmployee) => emp.employeeId !== assignedEmp.employeeId).map((emp: AssignedEmployee) => emp.employeeId);
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
                      {(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_recurrence_interval_weeks?.message}</p>}
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
                      {(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_start_week_offset && <p className="text-red-500 text-sm mt-1">{(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_start_week_offset?.message}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten für diesen Mitarbeiter gelten.
                    Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
                  </p>
                </div>
                
                {/* Daily Schedules for Employee */}
                {assignedEmp.assigned_daily_schedules.map((weekSchedule: any, weekIndex: number) => (
                  <div key={weekIndex} className="border p-3 rounded-md space-y-2 bg-background/50">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">Woche {weekIndex + 1} (Offset {(form.watch(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`) + weekIndex) % form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`)})</h5>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => handleCopyWeekToAllWeeksForEmployee(assignedIndex, weekIndex)}
                              disabled={form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) === 1}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Diesen Wochenplan in alle anderen Wochen für diesen Mitarbeiter kopieren</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {dayNames.map(day => {
                        const hoursFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.hours` as const;
                        const startFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.start` as const;
                        const endFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.end` as const;
                        const objectDailyHours = getObjectDailyHours(weekIndex, day);
                        const isDayValid = isDailyHoursValid(weekIndex, day);

                        // Only show days that have object hours
                        if (!objectDailyHours || objectDailyHours === 0) return null;

                        return (
                          <div key={day} className={cn(
                            "border p-3 rounded-md space-y-2",
                            !isDayValid && "border-destructive bg-destructive/5"
                          )}>
                            <h6 className="font-medium text-xs flex items-center justify-between">
                              {germanDayNames[day]}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-muted-foreground hover:text-primary"
                                      onClick={() => handleCopyDayToAllWeeksForEmployee(assignedIndex, weekIndex, day)}
                                      disabled={form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) === 1 || (!form.watch(hoursFieldName) && !form.watch(startFieldName) && !form.watch(endFieldName))}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Zeiten für diesen Tag in alle anderen Wochen für diesen Mitarbeiter kopieren</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </h6>
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
                                    step="0.01"
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
                                      handleAssignedDailyHoursChange(assignedIndex, weekIndex, day, e.target.value);
                                    }}
                                  />
                                </div>
                              )}
                            />
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
                                      handleAssignedStartTimeChange(assignedIndex, weekIndex, day, e.target.value);
                                    }}
                                  />
                                </div>
                              )}
                            />
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
                                      handleAssignedEndTimeChange(assignedIndex, weekIndex, day, e.target.value);
                                    }}
                                  />
                                </div>
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {!isDailyHoursValid(weekIndex, 'monday') && getObjectDailyHours(weekIndex, 'monday') && (
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                        ⚠️ Die Summe der zugewiesenen Stunden für jeden Tag in dieser Woche muss den Objektstunden entsprechen.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Object Hours Overview */}
            {selectedObjectId && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Objektarbeitszeiten Übersicht</h4>
                {objects.find(obj => obj.id === selectedObjectId)?.daily_schedules?.map((objectWeekSchedule: any, weekIndex: number) => (
                  <div key={weekIndex} className="mb-2">
                    <h5 className="font-semibold text-sm">Woche {weekIndex + 1}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {dayNames.map(day => {
                        const objectDayHours = objectWeekSchedule?.[day]?.hours;
                        const totalAssigned = getSumAssignedHoursForDay(weekIndex, day);
                        
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
                ))}
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