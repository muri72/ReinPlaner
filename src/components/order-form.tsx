"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, X, Clock, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { MultiSelectEmployees } from "@/components/multi-select-employees";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { getWeek } from 'date-fns';

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
  start: z.string().regex(timeRegex, "Ungültiges Format (HH:MM)").or(z.literal("")).optional().nullable(),
  end: z.string().regex(timeRegex, "Ungültiges Format (HH:MM)").or(z.literal("")).optional().nullable(),
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

export const baseOrderSchema = z.object({
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
    (val) => (val === "" || isNaN(Number(val)) ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(),
  requestStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  assignedEmployees: z.array(assignedEmployeeSchema).optional(),
});

const createOrderSchema = (objects: any[]) => baseOrderSchema.superRefine((data, ctx) => {
  if (data.assignedEmployees && data.assignedEmployees.length > 0 && data.objectId) {
    const selectedObject = objects.find((obj: any) => obj.id === data.objectId);
    if (selectedObject) {
      // Check for schedule length mismatch first
      data.assignedEmployees.forEach((assignedEmp, empIndex) => {
        if (assignedEmp.assigned_daily_schedules.length !== assignedEmp.assigned_recurrence_interval_weeks) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Die Anzahl der Wochenpläne muss dem Wiederholungsintervall (${assignedEmp.assigned_recurrence_interval_weeks}) entsprechen.`,
            path: [`assignedEmployees.${empIndex}.assigned_daily_schedules`],
          });
        }
      });

      // Now, check the sum of hours for each day in each week of the cycle
      const recurrenceInterval = selectedObject.recurrence_interval_weeks || 1;
      for (let weekIndex = 0; weekIndex < recurrenceInterval; weekIndex++) {
        dayNames.forEach(day => {
          const objectDailyHours = (selectedObject.daily_schedules?.[weekIndex] as any)?.[day]?.hours;

          // Only validate if the object has hours defined for this day
          if (objectDailyHours !== undefined && objectDailyHours !== null && objectDailyHours > 0) {
            
            // Calculate the sum of hours assigned to all employees for this specific day and week
            let sumAssignedHoursForDay = 0;
            const assignedList = (data.assignedEmployees as unknown as AssignedEmployee[] | undefined) ?? [];
            assignedList.forEach((assignedEmp) => {
              const assignedHours = (assignedEmp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
              sumAssignedHoursForDay += (assignedHours || 0);
            });

            // Compare the sum with the object's required hours
            // Allow assigned hours to be less than or equal to object hours
            if (sumAssignedHoursForDay > objectDailyHours + 0.1) { // Add a small tolerance for float comparison
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[day]} in Woche ${weekIndex + 1} (${sumAssignedHoursForDay.toFixed(2)} Std.) darf die Objektstunden (${objectDailyHours.toFixed(2)} Std.) nicht überschreiten.`,
                // Attach the error to a general field, as it's a collective issue
                path: [`assignedEmployees`], 
              });
            }
          }
        });
      }
    }
  }
});

export type OrderFormValues = z.infer<typeof baseOrderSchema>;
export type OrderFormInput = z.input<typeof baseOrderSchema>;

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

  const form = useForm<OrderFormInput>({
    resolver: zodResolver(createOrderSchema(objects)),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const { fields: assignedEmployeeFields, replace: replaceAssignedEmployees, update: updateAssignedEmployee } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const orderType = form.watch("orderType") as OrderFormValues["orderType"] | undefined;
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

      // Fetch only active employees
      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('last_name', { ascending: true });
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
    const assignedEmployees = (form.watch("assignedEmployees") ?? []) as AssignedEmployee[];
    const orderTypeSafe = (form.watch("orderType") as OrderFormValues["orderType"] | undefined) ?? 'one_time';
    const dueDate = form.watch("dueDate");
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);

    let newTotalEstimatedHours: number | null = null;

    if (['recurring', 'substitution', 'permanent'].includes(orderTypeSafe)) {
      let totalHoursInCycle = 0;
      let recurrenceInterval = 1;

      if (assignedEmployees && assignedEmployees.length > 0) {
        recurrenceInterval = Number(assignedEmployees[0]?.assigned_recurrence_interval_weeks ?? 1);

        totalHoursInCycle = assignedEmployees.reduce((total: number, emp: AssignedEmployee) => {
          const employeeSchedules = emp.assigned_daily_schedules ?? [];
          const employeeTotalHoursInCycle = employeeSchedules.reduce((cycleSum: number, weekSchedule: any) => {
            const weekHours = dayNames.reduce((weekSum: number, day) => {
              const dailyHours = weekSchedule?.[day]?.hours;
              const num = typeof dailyHours === 'number' ? dailyHours : Number(dailyHours ?? 0);
              return weekSum + (isNaN(num) ? 0 : num);
            }, 0);
            return cycleSum + weekHours;
          }, 0);
          return total + employeeTotalHoursInCycle;
        }, 0);
      } else if (selectedObject) {
        recurrenceInterval = selectedObject.recurrence_interval_weeks || 1;
        const objectSchedules = selectedObject.daily_schedules || [];
        totalHoursInCycle = objectSchedules.reduce((cycleSum: number, weekSchedule: any) => {
          const weekHours = dayNames.reduce((weekSum: number, day) => {
            const dailyHours = weekSchedule?.[day]?.hours;
            return weekSum + (dailyHours || 0);
          }, 0);
          return cycleSum + weekHours;
        }, 0);
      }
      // Store total hours per cycle, not per week
      newTotalEstimatedHours = totalHoursInCycle;
    } else if (orderTypeSafe === 'one_time' && dueDate) {
      let totalHoursForDay = 0;
      if (assignedEmployees && assignedEmployees.length > 0) {
        const dayOfWeek = dueDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        totalHoursForDay = assignedEmployees.reduce((total: number, emp: AssignedEmployee) => {
          const employeeRecurrenceInterval = Number(emp.assigned_recurrence_interval_weeks ?? 1);
          const employeeSchedules = emp.assigned_daily_schedules ?? [];
          const startWeekNumber = getWeek(dueDate, { weekStartsOn: 1 });
          const weekOffset = (startWeekNumber - Number(emp.assigned_start_week_offset ?? 0)) % employeeRecurrenceInterval;
          const currentWeekSchedule = employeeSchedules[weekOffset < 0 ? weekOffset + employeeRecurrenceInterval : weekOffset];
          const hours = currentWeekSchedule?.[dayKey]?.hours;
          const num = typeof hours === 'number' ? hours : Number(hours ?? 0);
          return total + (isNaN(num) ? 0 : num);
        }, 0);
      } else if (selectedObject) {
        const dayOfWeek = dueDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        const objectRecurrenceInterval = selectedObject.recurrence_interval_weeks;
        const objectSchedules = selectedObject.daily_schedules || [];
        const startWeekNumber = getWeek(dueDate, { weekStartsOn: 1 });
        const weekOffset = (startWeekNumber - (selectedObject.start_week_offset || 0)) % objectRecurrenceInterval;
        const currentWeekSchedule = objectSchedules[weekOffset < 0 ? weekOffset + objectRecurrenceInterval : weekOffset];
        totalHoursForDay = currentWeekSchedule?.[dayKey]?.hours || 0;
      }
      newTotalEstimatedHours = totalHoursForDay;
    }

    const currentTotal = form.getValues("totalEstimatedHours");
    const safeNewTotal = (typeof newTotalEstimatedHours === 'number' && isFinite(newTotalEstimatedHours)) ? parseFloat(newTotalEstimatedHours.toFixed(2)) : null;
    if (currentTotal !== safeNewTotal) {
      form.setValue("totalEstimatedHours", safeNewTotal, { shouldValidate: false });
    }
  }, [form.watch("assignedEmployees"), form.watch("orderType"), form.watch("dueDate"), selectedObjectId, objects, form]);

  const handleEmployeeSelectionChange = useCallback((selectedIds: string[]) => {
    const currentObjectId = form.getValues("objectId") ?? null;
    const selectedObject = objects.find(obj => obj.id === currentObjectId);

    if (!selectedObject) {
        replaceAssignedEmployees([]);
        return;
    }

    const currentAssignments = form.getValues("assignedEmployees") || [];

    // Filter out removed employees, keeping their data intact
    const keptAssignments = currentAssignments.filter(a => selectedIds.includes(a.employeeId));

    // Identify new employees to add
    const newEmployeeIds = selectedIds.filter(id => !currentAssignments.some(a => a.employeeId === id));

    const newAssignments = newEmployeeIds.map((employeeId) => {
        const newEmpData: AssignedEmployee = {
            employeeId,
            assigned_daily_schedules: [],
            assigned_recurrence_interval_weeks: selectedObject.recurrence_interval_weeks,
            assigned_start_week_offset: 0, // Starten immer in Woche 1
        };

        // Initialize assigned_daily_schedules based on object's recurrence interval
        for (let i = 0; i < selectedObject.recurrence_interval_weeks; i++) {
            const newWeekSchedule: z.infer<typeof weeklyScheduleSchema> = {};
            dayNames.forEach(day => {
                const objectDailySchedule = (selectedObject.daily_schedules?.[i] as any)?.[day];
                if (objectDailySchedule) {
                    newWeekSchedule[day] = {
                        hours: null, // Start with null hours for new employees
                        start: objectDailySchedule.start,
                        end: objectDailySchedule.end,
                    };
                }
            });
            newEmpData.assigned_daily_schedules.push(newWeekSchedule);
        }
        return newEmpData;
    });

    let finalAssignments = [...keptAssignments, ...newAssignments];

    // If there is now exactly one employee assigned, automatically assign all object hours to them.
    if (finalAssignments.length === 1) {
      const singleAssignment = finalAssignments[0];
      const schedules = singleAssignment.assigned_daily_schedules ?? [];
      for (let i = 0; i < selectedObject.recurrence_interval_weeks; i++) {
        dayNames.forEach(day => {
          const objectDailySchedule = (selectedObject.daily_schedules?.[i] as any)?.[day];
          if (objectDailySchedule) {
            schedules[i] = schedules[i] || {};
            (schedules[i] as any)[day] = {
              ...((schedules[i] as any)[day] || {}),
              hours: objectDailySchedule.hours,
            };
          }
        });
      }
      singleAssignment.assigned_daily_schedules = schedules;
    }

    replaceAssignedEmployees(finalAssignments);

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

    const hoursRaw = (currentSchedule as any).hours;
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw ?? NaN);
    if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
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

    const hoursRaw = (currentSchedule as any).hours;
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw ?? NaN);
    if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.start`, calculateStartTime(value, hours), { shouldValidate: true });
    } else {
      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}.start`, null, { shouldValidate: true });
    }
  }, [form]);

  const handleCopyDayToAllWeeksForEmployee = useCallback((
    employeeIndex: number,
    sourceWeekIndex: number,
    sourceDay: typeof dayNames[number]
  ) => {
    const sourceSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${sourceWeekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    const employeeRecurrenceInterval = Number(form.getValues(`assignedEmployees.${employeeIndex}.assigned_recurrence_interval_weeks`)) || 1;
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
  }, [form]);

  const handleCopyWeekToAllWeeksForEmployee = useCallback((
    employeeIndex: number,
    sourceWeekIndex: number
  ) => {
    const sourceWeekSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${sourceWeekIndex}`);
    if (!sourceWeekSchedule || Object.keys(sourceWeekSchedule).length === 0) {
      toast.info("Kein Wochenplan zum Kopieren vorhanden.");
      return;
    }

    let copiedCount = 0;
    const employeeRecurrenceInterval = Number(form.getValues(`assignedEmployees.${employeeIndex}.assigned_recurrence_interval_weeks`)) || 1;
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
  }, [form]);

  const handleFormSubmit: SubmitHandler<OrderFormInput> = async (data) => {
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
            const assignedList = (data.assignedEmployees as unknown as AssignedEmployee[] | undefined) ?? [];
            assignedList.forEach((assignedEmp) => {
              const assignedHours = (assignedEmp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
              sumAssignedHoursForDay += (assignedHours || 0);
            });

            // Only validate if there are actually assigned hours for this day
            if (sumAssignedHoursForDay > 0) {
              // Use a more lenient tolerance for floating point comparison
              // Validation: sumAssignedHoursForDay must be less than or equal to objectDailyHours
              if (sumAssignedHoursForDay > objectDailyHours + 0.1) {
                form.setError(`assignedEmployees`, {
                  type: "manual",
                  message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[day]} in Woche ${weekIndex + 1} (${sumAssignedHoursForDay.toFixed(2)} Std.) darf die Objektstunden (${objectDailyHours.toFixed(2)} Std.) nicht überschreiten.`,
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

    const result = await onSubmit(data as OrderFormValues);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
        replaceAssignedEmployees([]); // Reset schedules after successful creation
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

  const handleObjectCreated = async (newObjectId: string) => {
    if (selectedCustomerId) {
      // Refresh the objects list
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id').eq('customer_id', selectedCustomerId);
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);
      // Set the newly created object as selected
      form.setValue("objectId", newObjectId);
    }
  };

  const getObjectDailyHours = (weekIndex: number, day: typeof dayNames[number]): number | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    return (selectedObject?.daily_schedules?.[weekIndex] as any)?.[day]?.hours || null;
  };

  const getSumAssignedHoursForDay = (weekIndex: number, day: typeof dayNames[number]): number => {
    const currentAssignments = (form.watch("assignedEmployees") ?? []) as AssignedEmployee[];
    const sum = currentAssignments.reduce((total: number, emp: AssignedEmployee) => {
      const assignedHours = (emp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
      const num = typeof assignedHours === 'number' ? assignedHours : Number(assignedHours ?? 0);
      return total + (isNaN(num) ? 0 : num);
    }, 0);
    return typeof sum === 'number' && !isNaN(sum) ? sum : 0;
  };

  const isDailyHoursValid = (weekIndex: number, day: typeof dayNames[number]): boolean => {
    const objectHours = getObjectDailyHours(weekIndex, day);
    if (objectHours === null || objectHours === 0) return true;
    const sumAssigned = getSumAssignedHoursForDay(weekIndex, day);
    // Validation: sumAssigned must be less than or equal to objectHours
    return sumAssigned <= objectHours + 0.1; // Add a small tolerance for float comparison
  };

  const totalHoursLabel = ['recurring', 'substitution', 'permanent'].includes(((form.watch("orderType") as OrderFormValues["orderType"] | undefined) ?? 'one_time'))
    ? "Wochenstunden (automatisch berechnet)"
    : "Gesamtstunden (automatisch berechnet)";

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select onValueChange={(value: string) => {
          form.setValue("customerId", value);
          form.setValue("objectId", null);
          form.setValue("customerContactId", null);
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

      <div className="space-y-2">
        <Label htmlFor="objectId">Objekt</Label>
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Select onValueChange={(value: string) => {
              form.setValue("objectId", value === "unassigned" ? null : value);
              form.setValue("customerContactId", null);
              replaceAssignedEmployees([]);
            }} value={form.watch("objectId") || "unassigned"} disabled={!selectedCustomerId}>
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
            {form.formState.errors.objectId && <p className="text-red-500 text-sm">{form.formState.errors.objectId.message}</p>}
            {!selectedCustomerId && (
                <p className="text-muted-foreground text-sm">Bitte wählen Sie zuerst einen Kunden aus.</p>
            )}
          </div>
          <ObjectCreateDialog
            customerId={selectedCustomerId}
            onObjectCreated={handleObjectCreated}
            disabled={!selectedCustomerId}
          />
        </div>
      </div>

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
        <CustomerContactCreateDialog
          customerId={selectedCustomerId}
          onContactCreated={handleCustomerContactCreated}
          disabled={!selectedCustomerId}
        />
      </div>

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
        <div className="space-y-4">
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
        </div>
      )}
      
      <div className="space-y-4">
        <Label>Zugewiesene Mitarbeiter (optional)</Label>
        <MultiSelectEmployees
          employees={allEmployees}
          selectedEmployeeIds={assignedEmployeeFields.map((emp) => emp.employeeId)}
          onSelectionChange={handleEmployeeSelectionChange}
          disabled={!selectedObjectId}
        />
        {form.formState.errors.assignedEmployees && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees.message}</p>
        )}
        {!selectedObjectId && (
            <p className="text-muted-foreground text-sm mt-1">Bitte wählen Sie zuerst ein Objekt aus, um Mitarbeiter zuzuweisen.</p>
        )}
        
        {assignedEmployeeFields.length > 0 && (
          <div className="mt-4 space-y-4">
            <h3 className="text-lg font-semibold">Arbeitszeiten pro Mitarbeiter</h3>
            {(form.formState.errors as any).assignedEmployees && <p className="text-red-500 text-sm mt-1">{(form.formState.errors as any).assignedEmployees.message}</p>}
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
                      const newSelectedIds = assignedEmployeeFields.filter((emp) => emp.employeeId !== assignedEmp.employeeId).map((emp) => emp.employeeId);
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
                      <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`}>Zyklus</Label>
                      <Select
                        onValueChange={(value: string) => {
                          form.setValue(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`, parseInt(value), { shouldValidate: true });
                          // Reset start offset if it exceeds the new interval
                          const currentOffsetRaw = form.getValues(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`);
                          const currentOffset = typeof currentOffsetRaw === 'number' ? currentOffsetRaw : 0;
                          if (currentOffset >= parseInt(value)) {
                            form.setValue(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`, 0, { shouldValidate: true });
                          }
                        }}
                        value={String(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Zyklus auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Woche (wöchentlich)</SelectItem>
                          <SelectItem value="2">2 Wochen (alle 2 Wochen)</SelectItem>
                          <SelectItem value="4">4 Wochen (monatlich)</SelectItem>
                          <SelectItem value="8">8 Wochen (alle 2 Monate)</SelectItem>
                          <SelectItem value="12">12 Wochen (quartalsweise)</SelectItem>
                          <SelectItem value="26">26 Wochen (halbjährlich)</SelectItem>
                          <SelectItem value="52">52 Wochen (jährlich)</SelectItem>
                        </SelectContent>
                      </Select>
                      {(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{(form.formState.errors.assignedEmployees?.[assignedIndex] as any)?.assigned_recurrence_interval_weeks?.message}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Wie oft arbeitet dieser Mitarbeiter hier?
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}>Start in</Label>
                      <Controller
                        name={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}
                        control={form.control}
                        defaultValue={0}
                        render={({ field }) => (
                          <Select
                            onValueChange={(value: string) => field.onChange(parseInt(value))}
                            value={String(field.value ?? 0)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Start auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1) }, (_, i) => {
                                const weekNum = i + 1;
                                const label = weekNum === 1
                                  ? "Erste Woche"
                                  : weekNum === 2
                                    ? "Zweite Woche"
                                    : weekNum === 3
                                      ? "Dritte Woche"
                                      : weekNum === 4
                                        ? "Vierte Woche"
                                        : `Woche ${weekNum}`;
                                return (
                                  <SelectItem key={i} value={String(i)}>
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Zyklus startet in dieser Woche
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten für diesen Mitarbeiter gelten.
                    Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
                  </p>
                </div>
                
                {(assignedEmp.assigned_daily_schedules ?? []).map((weekSchedule, weekIndex) => (
                  <div key={weekIndex} className="border p-3 rounded-md space-y-2 bg-background/50">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">
                        Woche {weekIndex + 1} (Offset {
                          ((Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`) ?? 0) + weekIndex) %
                            (Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1)))
                        })
                      </h5>
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
                                    value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
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
                              {totalAssigned.toFixed(2)}h / {objectDayHours.toFixed(2)}h
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
        <Label htmlFor="totalEstimatedHours">{totalHoursLabel}</Label>
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