"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useFormUnsavedChangesForCreate } from "@/components/ui/unsaved-changes-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils";
import { cn, calculateEndTime, calculateStartTime, parseLocalDate } from "@/lib/utils";
import { getWeek } from 'date-fns';
import { getServices } from "@/app/dashboard/services/actions";
import {
  preprocessNumber,
  timeRegex,
  dayNames,
  germanDayNames,
  dailyScheduleSchema,
  weeklyScheduleSchema,
} from "@/lib/utils/form-utils";
import {
  OrderBasicInfoSection,
  OrderScheduleSection,
  OrderAssignmentsSection,
  OrderFinancialsSection,
} from "@/components/order-form/index";

// Helper component for labels with required asterisk
export function LabelWithRequired({ htmlFor, children, required, className }: { htmlFor: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        className
      )}
    >
      {children}
    </Label>
  );
}

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
  status: z.enum(["active", "inactive"]).default("active"),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  orderType: z.enum(["one_time", "recurring"]).default("one_time"),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("low"),
  totalEstimatedHours: z.preprocess(
    (val) => (val === "" || isNaN(Number(val)) ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(999, "Stunden sind zu hoch")).optional()
  ),
  fixedMonthlyPrice: z.preprocess(
    (val) => (val === "" || isNaN(Number(val)) ? null : Number(val)),
    z.nullable(z.number().min(0, "Preis muss positiv sein").max(999999, "Preis ist zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.string().optional().nullable(),
  serviceKey: z.string().optional().nullable(),
  markupPercentage: z.preprocess(
    (val) => (val === "" || isNaN(Number(val)) ? null : Number(val)),
    z.nullable(z.number().min(0, "Prozentsatz muss positiv sein").max(100, "Prozentsatz ist zu hoch")).optional()
  ),
  customHourlyRate: z.preprocess(
    (val) => (val === "" || isNaN(Number(val)) ? null : Number(val)),
    z.nullable(z.number().min(0, "Stundensatz muss positiv sein").max(999, "Stundensatz ist zu hoch")).optional()
  ),
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

// Re-export dayNames and germanDayNames for sub-components
export { dayNames, germanDayNames };

interface OrderFormProps {
  initialData?: Partial<OrderFormInput>;
  onSubmit: (data: OrderFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isInDialog?: boolean;
  title?: string;
  description?: string;
}

export function OrderForm({ initialData, onSubmit, submitButtonText, onSuccess, isInDialog = false, title, description }: OrderFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [serviceRates, setServiceRates] = useState<{ service_type: string; hourly_rate: number }[]>([]);
  const [services, setServices] = useState<{ id: string; key: string; title: string; default_hourly_rate: number | null }[]>([]);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const resolvedDefaultValues: OrderFormValues = {
    title: initialData?.title ?? "",
    description: initialData?.description ?? null,
    status: initialData?.status ?? "active",
    customerId: initialData?.customerId ?? "",
    objectId: initialData?.objectId ?? null,
    customerContactId: initialData?.customerContactId ?? null,
    orderType: initialData?.orderType ?? "one_time",
    startDate: initialData?.startDate
      ? (typeof initialData.startDate === 'string' ? parseLocalDate(initialData.startDate) : new Date(initialData.startDate))
      : null,
    endDate: initialData?.endDate
      ? (typeof initialData.endDate === 'string' ? parseLocalDate(initialData.endDate) : new Date(initialData.endDate))
      : null,
    priority: initialData?.priority ?? "low",
    totalEstimatedHours: (initialData?.totalEstimatedHours as number | null | undefined) ?? null,
    fixedMonthlyPrice: (initialData?.fixedMonthlyPrice as number | null | undefined) ?? null,
    notes: initialData?.notes ?? null,
    serviceType: initialData?.serviceType ?? null,
    serviceKey: initialData?.serviceKey ?? null,
    markupPercentage: (initialData?.markupPercentage as number | null | undefined) ?? null,
    customHourlyRate: (initialData?.customHourlyRate as number | null | undefined) ?? null,
    requestStatus: initialData?.requestStatus ?? "approved",
    assignedEmployees: (initialData?.assignedEmployees as OrderFormValues['assignedEmployees']) ?? [],
  };

  const form = useForm<OrderFormInput>({
    resolver: zodResolver(createOrderSchema(objects)),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  // Determine if this is create mode (no initialData means creating a new order)
  const isCreateMode = !initialData;

  // Calculate actual dirty state - only true if user has actually changed fields
  const hasActualChanges = Object.keys(form.formState.dirtyFields).length > 0;

  // Register with unsaved changes context
  useFormUnsavedChangesForCreate("order-form", hasActualChanges, isCreateMode);

  const { fields: assignedEmployeeFields, replace: replaceAssignedEmployees } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");

  // Watch assignedEmployees for real-time validation
  const watchedAssignedEmployees = form.watch("assignedEmployees");

  // Robustly handle initialData changes (e.g., when dialog reopens)
  useEffect(() => {
    if (!initialData) return;

    const populateForm = () => {
      form.setValue("title", initialData?.title ?? "", { shouldValidate: false });
      form.setValue("description", initialData?.description ?? null, { shouldValidate: false });
      form.setValue("status", (initialData?.status as OrderFormValues["status"]) ?? "active", { shouldValidate: false });
      form.setValue("orderType", (initialData?.orderType as OrderFormValues["orderType"]) ?? "one_time", { shouldValidate: false });
      form.setValue("priority", (initialData?.priority as OrderFormValues["priority"]) ?? "low", { shouldValidate: false });
      form.setValue("requestStatus", (initialData?.requestStatus as OrderFormValues["requestStatus"]) ?? "approved", { shouldValidate: false });

      if (initialData?.startDate) {
        const startDate = initialData.startDate instanceof Date
          ? initialData.startDate
          : (typeof initialData.startDate === 'string' ? parseLocalDate(initialData.startDate) : new Date(initialData.startDate));
        if (startDate && !isNaN(startDate.getTime())) {
          form.setValue("startDate", startDate, { shouldValidate: false });
        }
      } else {
        form.setValue("startDate", null, { shouldValidate: false });
      }

      if (initialData?.endDate) {
        const endDate = initialData.endDate instanceof Date
          ? initialData.endDate
          : (typeof initialData.endDate === 'string' ? parseLocalDate(initialData.endDate) : new Date(initialData.endDate));
        if (endDate && !isNaN(endDate.getTime())) {
          form.setValue("endDate", endDate, { shouldValidate: false });
        }
      } else {
        form.setValue("endDate", null, { shouldValidate: false });
      }

      if (initialData?.customerId) {
        form.setValue("customerId", initialData.customerId, { shouldValidate: false });
      }
      if (initialData?.objectId !== undefined && initialData?.objectId !== null) {
        form.setValue("objectId", initialData.objectId, { shouldValidate: false });
      }
      if (initialData?.customerContactId !== undefined && initialData?.customerContactId !== null) {
        form.setValue("customerContactId", initialData.customerContactId, { shouldValidate: false });
      }

      if (initialData?.totalEstimatedHours !== undefined) {
        const hours = typeof initialData.totalEstimatedHours === 'number' ? initialData.totalEstimatedHours : null;
        form.setValue("totalEstimatedHours", hours, { shouldValidate: false });
      }
      if (initialData?.fixedMonthlyPrice !== undefined) {
        const price = typeof initialData.fixedMonthlyPrice === 'number' ? initialData.fixedMonthlyPrice : null;
        form.setValue("fixedMonthlyPrice", price, { shouldValidate: false });
      }

      form.setValue("notes", initialData?.notes ?? null, { shouldValidate: false });

      if (initialData?.serviceKey) {
        form.setValue("serviceKey", initialData.serviceKey, { shouldValidate: false });
        if (!initialData.serviceType && services.length > 0) {
          const service = services.find(s => s.key === initialData.serviceKey);
          if (service) {
            form.setValue("serviceType", service.title, { shouldValidate: false });
          }
        } else {
          form.setValue("serviceType", initialData.serviceType ?? null, { shouldValidate: false });
        }
      } else if (initialData?.serviceType) {
        const service = services.find(s => s.title === initialData.serviceType);
        if (service) {
          form.setValue("serviceKey", service.key, { shouldValidate: false });
        }
        form.setValue("serviceType", initialData.serviceType ?? null, { shouldValidate: false });
      } else {
        form.setValue("serviceType", null, { shouldValidate: false });
        form.setValue("serviceKey", null, { shouldValidate: false });
      }

      if (initialData?.markupPercentage !== undefined) {
        const markup = typeof initialData.markupPercentage === 'number' ? initialData.markupPercentage : null;
        form.setValue("markupPercentage", markup, { shouldValidate: false });
      }
      if (initialData?.customHourlyRate !== undefined) {
        const rate = typeof initialData.customHourlyRate === 'number' ? initialData.customHourlyRate : null;
        form.setValue("customHourlyRate", rate, { shouldValidate: false });
      }

      if (initialData?.assignedEmployees && Array.isArray(initialData.assignedEmployees)) {
        const validEmployees = initialData.assignedEmployees
          .filter((emp: any) => emp && typeof emp === 'object')
          .map((emp: any) => ({
            employeeId: emp.employeeId || "",
            assigned_daily_schedules: Array.isArray(emp.assigned_daily_schedules) ? emp.assigned_daily_schedules : [],
            assigned_recurrence_interval_weeks: Number(emp.assigned_recurrence_interval_weeks ?? 1),
            assigned_start_week_offset: Number(emp.assigned_start_week_offset ?? 0),
          }))
          .filter(emp => emp.employeeId);

        form.setValue("assignedEmployees", validEmployees, { shouldValidate: false });
      } else {
        form.setValue("assignedEmployees", [], { shouldValidate: false });
      }
    };

    const timeoutId = setTimeout(() => {
      populateForm();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [initialData, form]);

  // Effect to handle customer contacts when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

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

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name, status').order('last_name', { ascending: true });
      if (employeesData) setAllEmployees(employeesData);
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);

      try {
        const servicesData = await getServices();
        setServices(servicesData.map(s => ({
          id: s.id,
          key: s.key,
          title: s.name,
          default_hourly_rate: s.default_hourly_rate ?? null
        })));
      } catch (error) {
        console.error("Fehler beim Laden der Services:", error);
      }

      const { data: ratesData, error: ratesError } = await supabase.from('service_rates').select('service_type, hourly_rate');
      if (ratesData) setServiceRates(ratesData);
      if (ratesError) console.error("Fehler beim Laden der Stundensätze:", ratesError);
    };

    fetchDropdownData();
  }, [supabase, isCreateMode, form]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  // Auto-generate title: "Object • Customer"
  const [userEditedTitle, setUserEditedTitle] = React.useState(false);

  useEffect(() => {
    setUserEditedTitle(false);
  }, [initialData?.title]);

  useEffect(() => {
    const customerName = customers.find(c => c.id === selectedCustomerId)?.name || '';
    const objectName = objects.find(o => o.id === selectedObjectId)?.name || '';
    const parts = [];
    if (objectName) parts.push(objectName);
    if (customerName) parts.push(customerName);
    const generatedTitle = parts.join(' • ');

    form.setValue("title", generatedTitle, { shouldValidate: false, shouldDirty: !userEditedTitle });
  }, [selectedCustomerId, selectedObjectId, customers, objects, form, userEditedTitle]);

  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  // Effect to calculate total estimated hours based on assignments or object data
  useEffect(() => {
    const assignedEmployees = (form.watch("assignedEmployees") ?? []) as AssignedEmployee[];
    const orderTypeSafe = (form.watch("orderType") as OrderFormValues["orderType"] | undefined) ?? 'one_time';
    const endDate = form.watch("endDate");
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);

    let newTotalEstimatedHours: number | null = null;

    if (['recurring'].includes(orderTypeSafe)) {
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
      newTotalEstimatedHours = totalHoursInCycle;
    } else if (orderTypeSafe === 'one_time' && endDate) {
      let totalHoursForDay = 0;
      if (assignedEmployees && assignedEmployees.length > 0) {
        const dayOfWeek = endDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        totalHoursForDay = assignedEmployees.reduce((total: number, emp: AssignedEmployee) => {
          const employeeRecurrenceInterval = Number(emp.assigned_recurrence_interval_weeks ?? 1);
          const employeeSchedules = emp.assigned_daily_schedules ?? [];
          const startWeekNumber = getWeek(endDate, { weekStartsOn: 1 });
          const weekOffset = (startWeekNumber - Number(emp.assigned_start_week_offset ?? 0)) % employeeRecurrenceInterval;
          const currentWeekSchedule = employeeSchedules[weekOffset < 0 ? weekOffset + employeeRecurrenceInterval : weekOffset];
          const hours = currentWeekSchedule?.[dayKey]?.hours;
          const num = typeof hours === 'number' ? hours : Number(hours ?? 0);
          return total + (isNaN(num) ? 0 : num);
        }, 0);
      } else if (selectedObject) {
        const dayOfWeek = endDate.getDay();
        const dayKey = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        const objectRecurrenceInterval = selectedObject.recurrence_interval_weeks;
        const objectSchedules = selectedObject.daily_schedules || [];
        const startWeekNumber = getWeek(endDate, { weekStartsOn: 1 });
        const weekOffset = (startWeekNumber - (selectedObject.start_week_offset || 0)) % objectRecurrenceInterval;
        const currentWeekSchedule = objectSchedules[weekOffset < 0 ? weekOffset + objectRecurrenceInterval : weekOffset];
        totalHoursForDay = currentWeekSchedule?.[dayKey]?.hours || 0;
      }
      newTotalEstimatedHours = totalHoursForDay;
    }

    const currentTotal = form.getValues("totalEstimatedHours");
    const safeNewTotal = (typeof newTotalEstimatedHours === 'number' && isFinite(newTotalEstimatedHours)) ? parseFloat(newTotalEstimatedHours.toFixed(2)) : null;
    if (currentTotal !== safeNewTotal) {
      form.setValue("totalEstimatedHours", safeNewTotal, { shouldValidate: false, shouldDirty: false });
    }
  }, [watchedAssignedEmployees, form.watch("orderType"), form.watch("endDate"), selectedObjectId, objects, form]);

  const recalculateTotalHours = useCallback(() => {
    let total = 0;
    const assignments = form.getValues("assignedEmployees") || [];
    const orderType = (form.getValues("orderType") as string) ?? 'one_time';

    assignments.forEach((assignment) => {
      if (assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0) {
        const weeksToSum = ['recurring'].includes(orderType)
          ? 1
          : assignment.assigned_daily_schedules.length;

        for (let weekIndex = 0; weekIndex < weeksToSum; weekIndex++) {
          const weekSchedule = assignment.assigned_daily_schedules[weekIndex];
          if (!weekSchedule) continue;

          dayNames.forEach(day => {
            const dayData = weekSchedule?.[day];
            if (dayData && typeof dayData.hours === 'number') {
              total += dayData.hours;
            }
          });
        }
      }
    });

    form.setValue("totalEstimatedHours", total, { shouldValidate: false });
  }, [form]);

  useEffect(() => {
    recalculateTotalHours();
  }, []);

  useEffect(() => {
    recalculateTotalHours();
  }, [watchedAssignedEmployees, form.watch("orderType")]);

  const handleEmployeeSelectionChange = useCallback((selectedIds: string[]) => {
    const currentObjectId = form.getValues("objectId") ?? null;
    const selectedObject = objects.find(obj => obj.id === currentObjectId);

    if (!selectedObject) {
      replaceAssignedEmployees([]);
      return;
    }

    const currentAssignments = form.getValues("assignedEmployees") || [];

    const keptAssignments = currentAssignments.filter(a => selectedIds.includes(a.employeeId));

    const newEmployeeIds = selectedIds.filter(id => !currentAssignments.some(a => a.employeeId === id));

    const newAssignments = newEmployeeIds.map((employeeId) => {
      const newEmpData: AssignedEmployee = {
        employeeId,
        assigned_daily_schedules: [],
        assigned_recurrence_interval_weeks: selectedObject.recurrence_interval_weeks,
        assigned_start_week_offset: 0,
      };

      for (let i = 0; i < selectedObject.recurrence_interval_weeks; i++) {
        const newWeekSchedule: z.infer<typeof weeklyScheduleSchema> = {};
        dayNames.forEach(day => {
          const objectDailySchedule = (selectedObject.daily_schedules?.[i] as any)?.[day];
          if (objectDailySchedule) {
            newWeekSchedule[day] = {
              hours: null,
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

  const handleCopyDayToOtherDaysInSameWeek = useCallback((
    employeeIndex: number,
    weekIndex: number,
    sourceDay: typeof dayNames[number]
  ) => {
    const sourceSchedule = form.getValues(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.", {
        description: `Bitte geben Sie zuerst Arbeitszeiten für ${germanDayNames[sourceDay]} ein.`
      });
      return;
    }

    let copiedCount = 0;

    const currentObjectId = form.getValues("objectId");
    const selectedObject = objects.find(obj => obj.id === currentObjectId);

    let availableDays: typeof dayNames[number][] = [...dayNames];
    if (selectedObject?.daily_schedules && Array.isArray(selectedObject.daily_schedules)) {
      availableDays = dayNames.filter(day => {
        const daySchedule = selectedObject.daily_schedules[weekIndex]?.[day];
        return daySchedule && daySchedule.hours && daySchedule.hours > 0;
      });
    }

    if (selectedObject?.daily_schedules) {
      for (const day of dayNames) {
        if (!availableDays.includes(day)) {
          form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${day}`, {}, { shouldValidate: true });
        }
      }
    }

    for (const targetDay of availableDays) {
      if (targetDay === sourceDay) continue;

      if (selectedObject && sourceSchedule?.hours) {
        const objectDayHours = (selectedObject.daily_schedules?.[weekIndex] as any)?.[targetDay]?.hours;
        if (objectDayHours && sourceSchedule.hours > objectDayHours + 0.1) {
          toast.warning(`Warnung: ${germanDayNames[targetDay]}`,
            { description: `Arbeitszeiten (${sourceSchedule.hours}h) überschreiten Objektstunden (${objectDayHours}h) - wurde trotzdem kopiert.` }
          );
        }
      }

      form.setValue(`assignedEmployees.${employeeIndex}.assigned_daily_schedules.${weekIndex}.${targetDay}`, sourceSchedule, { shouldValidate: true });
      copiedCount++;
    }

    if (copiedCount > 0) {
      const availableDayNamesStr = availableDays.map(d => germanDayNames[d]).join(', ');
      toast.success(`Zeiten von ${germanDayNames[sourceDay]} wurden in ${copiedCount} ${copiedCount === 1 ? 'weiteren Tag' : 'weitere Tage'} kopiert (nur verfügbare Tage: ${availableDayNamesStr}).`);
      recalculateTotalHours();
    } else {
      toast.info("Keine weiteren Tage zum Kopieren gefunden.");
    }
  }, [form, objects]);

  const handleFormSubmit: SubmitHandler<OrderFormInput> = async (data) => {
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        let validationError = false;
        for (let weekIndex = 0; weekIndex < selectedObject.recurrence_interval_weeks; weekIndex++) {
          dayNames.forEach(day => {
            const objectDailyHours = (selectedObject.daily_schedules?.[weekIndex] as any)?.[day]?.hours;
            if (objectDailyHours === null || objectDailyHours === undefined || objectDailyHours === 0) return;

            let sumAssignedHoursForDay = 0;
            const assignedList = (data.assignedEmployees as unknown as AssignedEmployee[] | undefined) ?? [];
            assignedList.forEach((assignedEmp) => {
              const assignedHours = (assignedEmp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
              sumAssignedHoursForDay += (assignedHours || 0);
            });

            if (sumAssignedHoursForDay > 0) {
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
        replaceAssignedEmployees([]);
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

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const handleObjectCreated = async (newObjectId: string) => {
    if (selectedCustomerId) {
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id').eq('customer_id', selectedCustomerId);
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);
      form.setValue("objectId", newObjectId);
    }
  };

  const handleCustomerChange = (value: string) => {
    form.setValue("customerId", value);
    form.setValue("objectId", null);
    form.setValue("customerContactId", null);
    replaceAssignedEmployees([]);
  };

  const handleObjectChange = (value: string | null) => {
    form.setValue("objectId", value);
    form.setValue("customerContactId", null);
    replaceAssignedEmployees([]);
  };

  const handleServiceChange = (value: string) => {
    form.setValue("serviceKey", value);
    const service = services.find(s => s.key === value);
    if (service) {
      form.setValue("serviceType", service.title);
    }
  };

  const totalHoursLabel = ['recurring'].includes(((form.watch("orderType") as OrderFormValues["orderType"] | undefined) ?? 'one_time'))
    ? "Wochenstunden (automatisch berechnet)"
    : "Gesamtstunden (automatisch berechnet)";

  // Effect to calculate total hours based on service rate and fixed price
  useEffect(() => {
    const fixedPrice = form.watch("fixedMonthlyPrice") as number | null | undefined;
    const serviceKey = form.watch("serviceKey");
    const markupPercentage = form.watch("markupPercentage") as number | null | undefined;
    const customHourlyRate = form.watch("customHourlyRate") as number | null | undefined;

    if (fixedPrice && fixedPrice > 0 && serviceKey) {
      const service = services.find(s => s.key === serviceKey);
      const defaultRate = Number(service?.default_hourly_rate || 0);

      if (defaultRate > 0) {
        let finalRate = Number(customHourlyRate || defaultRate);
        if (markupPercentage && markupPercentage > 0) {
          finalRate = finalRate * (1 + markupPercentage / 100);
        }

        const calculatedHours = fixedPrice / finalRate;
        const currentHours = form.getValues("totalEstimatedHours");

        if (!currentHours || currentHours === 0) {
          form.setValue("totalEstimatedHours", parseFloat(calculatedHours.toFixed(2)), { shouldValidate: false });
        }
      }
    }
  }, [form.watch("fixedMonthlyPrice"), form.watch("serviceKey"), form.watch("markupPercentage"), form.watch("customHourlyRate"), services, form]);

  return (
    <>
      {!isInDialog && (title || description) && (
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <UnsavedChangesProtection formId="order-form">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
          <OrderBasicInfoSection
            form={form}
            customers={customers}
            filteredObjects={filteredObjects}
            selectedCustomerId={selectedCustomerId}
            selectedObjectId={selectedObjectId}
            customerContacts={customerContacts}
            services={services}
            userEditedTitle={userEditedTitle}
            setUserEditedTitle={setUserEditedTitle}
            onCustomerChange={handleCustomerChange}
            onObjectChange={handleObjectChange}
            onCustomerContactCreated={handleCustomerContactCreated}
            onObjectCreated={handleObjectCreated}
            onServiceChange={handleServiceChange}
            replaceAssignedEmployees={replaceAssignedEmployees}
          />

          <OrderScheduleSection
            form={form}
          />

          <OrderAssignmentsSection
            form={form}
            allEmployees={allEmployees}
            selectedObjectId={selectedObjectId}
            objects={objects}
            onEmployeeSelectionChange={handleEmployeeSelectionChange}
            handleAssignedDailyHoursChange={handleAssignedDailyHoursChange}
            handleAssignedStartTimeChange={handleAssignedStartTimeChange}
            handleAssignedEndTimeChange={handleAssignedEndTimeChange}
            handleCopyDayToOtherDaysInSameWeek={handleCopyDayToOtherDaysInSameWeek}
            recalculateTotalHours={recalculateTotalHours}
          />

          <OrderFinancialsSection
            form={form}
            services={services}
            totalHoursLabel={totalHoursLabel}
          />

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel={submitButtonText}
            cancelLabel="Abbrechen"
            showCancel={!isInDialog}
            submitVariant="default"
            loadingText={`${submitButtonText}...`}
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            onSuccess?.();
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Auftrags-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </UnsavedChangesProtection>
    </>
  );
}
