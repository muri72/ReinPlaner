"use client";

import { useForm, SubmitHandler, useFieldArray, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, X } from "lucide-react";
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
import { cn } from "@/lib/utils"; // Import cn for conditional styling

// Definierte Liste der Dienstleistungen
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

// Helper function for number preprocessing
const preprocessNumber = (val: unknown) => (val === "" || isNaN(Number(val)) ? null : Number(val));
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Definieren von dayNames als const-Array
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

// Define the schema for a single assigned employee
const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_monday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_tuesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_wednesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_thursday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_friday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_saturday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_sunday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  // New time fields
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
}).superRefine((data, ctx) => {
  // Validate each day's time pair for assigned employees
  dayNames.forEach(day => {
    const startTimeKey = `assigned_${day}_start_time` as keyof typeof data;
    const endTimeKey = `assigned_${day}_end_time` as keyof typeof data;
    const hoursKey = `assigned_${day}_hours` as keyof typeof data;

    const start = data[startTimeKey] as string | null | undefined;
    const end = data[endTimeKey] as string | null | undefined;
    const hours = data[hoursKey] as number | null | undefined;

    if (start && !end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Endzeit ist erforderlich, wenn Startzeit angegeben ist.",
        path: [endTimeKey],
      });
    } else if (!start && end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Startzeit ist erforderlich, wenn Endzeit angegeben ist.",
        path: [startTimeKey],
      });
    } else if (start && end) {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);

      const startTimeInMinutes = startH * 60 + startM;
      let endTimeInMinutes = endH * 60 + endM;

      if (endTimeInMinutes < startTimeInMinutes) {
        endTimeInMinutes += 24 * 60; // Assume next day
      }

      if (endTimeInMinutes <= startTimeInMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Endzeit muss nach der Startzeit liegen.",
          path: [endTimeKey],
        });
      }
      // Optional: Validate if hours match calculated duration
      if (hours !== null && hours !== undefined) {
        const calculatedDurationMinutes = endTimeInMinutes - startTimeInMinutes;
        const calculatedHours = calculatedDurationMinutes / 60;
        if (Math.abs(calculatedHours - hours) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Stunden (${hours.toFixed(1)}) stimmen nicht mit der Dauer (${calculatedHours.toFixed(1)}) überein.`,
            path: [hoursKey],
          });
        }
      }
    }
  });
});

// Infer the TypeScript type from the schema
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
  assignedEmployees: z.array(assignedEmployeeSchema).optional(), // Use the new schema here
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
    monday_end_time: string | null;
    tuesday_start_time: string | null;
    tuesday_end_time: string | null;
    wednesday_start_time: string | null;
    wednesday_end_time: string | null;
    thursday_start_time: string | null;
    thursday_end_time: string | null;
    friday_start_time: string | null;
    friday_end_time: string | null;
    saturday_start_time: string | null;
    saturday_end_time: string | null;
    sunday_start_time: string | null;
    sunday_end_time: string | null;
    total_weekly_hours: number | null;
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

  const { fields: assignedEmployeeFields, append: appendEmployee, remove: removeEmployee, update: updateEmployeeField } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const selectedAssignedEmployees = form.watch("assignedEmployees");

  // Funktion zum Laden der Kundenkontakte
  const fetchCustomerContacts = async (customerId: string) => {
    const { data: contactsData, error: contactsError } = await supabase
      .from('customer_contacts')
      .select('id, first_name, last_name, customer_id')
      .eq('customer_id', customerId)
      .order('last_name', { ascending: true });
    if (contactsData) setCustomerContacts(contactsData);
    if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
  };

  // Daten für Dropdowns laden
  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name');
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      // Fetch objects with all time fields
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time, total_weekly_hours');
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesData) setAllEmployees(employeesData);
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
    };
    fetchDropdownData();
  }, [supabase]);

  // Kundenkontakte laden, wenn sich der ausgewählte Kunde ändert
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  // Automatische Titelgenerierung
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

  // Objekte filtern basierend auf ausgewähltem Kunden
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  // Logic for distributing daily hours and times
  const distributeDailyHoursAndTimes = useCallback((
    currentObjectId: string | null,
    currentAssignedEmployees: AssignedEmployee[],
    isInitialLoad: boolean = false
  ) => {
    if (!currentObjectId || !currentAssignedEmployees || currentAssignedEmployees.length === 0) {
      return;
    }

    const selectedObject = objects.find(obj => obj.id === currentObjectId);
    if (!selectedObject) return;

    const numAssignedEmployees = currentAssignedEmployees.length;

    dayNames.forEach(day => {
      const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
      const objectStartTime = selectedObject[`${day}_start_time` as keyof typeof selectedObject] as string | null;
      const objectEndTime = selectedObject[`${day}_end_time` as keyof typeof selectedObject] as string | null;

      if (numAssignedEmployees === 1) {
        // Case 1: Only 1 employee, assign object hours and times 1:1
        const assignedEmp = currentAssignedEmployees[0];
        const shouldUpdateHours = assignedEmp[`assigned_${day}_hours`] !== objectDailyHours;
        const shouldUpdateStartTime = assignedEmp[`assigned_${day}_start_time`] !== objectStartTime;
        const shouldUpdateEndTime = assignedEmp[`assigned_${day}_end_time`] !== objectEndTime;

        if (shouldUpdateHours || shouldUpdateStartTime || shouldUpdateEndTime) {
          updateEmployeeField(0, {
            ...assignedEmp,
            [`assigned_${day}_hours`]: objectDailyHours,
            [`assigned_${day}_start_time`]: objectStartTime,
            [`assigned_${day}_end_time`]: objectEndTime,
          });
        }
      } else {
        // Case 2: Multiple employees, distribute hours and clear times (times cannot be easily distributed)
        const suggestedDailyHoursPerEmployeeValue = objectDailyHours !== null ? parseFloat((objectDailyHours / numAssignedEmployees).toFixed(2)) : null;

        currentAssignedEmployees.forEach((assignedEmp, index) => {
          const currentAssignedHours = assignedEmp[`assigned_${day}_hours` as keyof typeof assignedEmp] as number | null;
          const currentAssignedStartTime = assignedEmp[`assigned_${day}_start_time` as keyof typeof assignedEmp] as string | null;
          const currentAssignedEndTime = assignedEmp[`assigned_${day}_end_time` as keyof typeof assignedEmp] as string | null;
          
          // Only update if it's an initial load (or new assignment) AND the field is not already set
          // or if the number of assigned employees has changed, suggesting a re-distribution
          const shouldUpdateHours = isInitialLoad || currentAssignedHours === null || currentAssignedHours === undefined || numAssignedEmployees !== (initialData?.assignedEmployees?.length || 0);
          const shouldUpdateTimes = isInitialLoad || currentAssignedStartTime !== null || currentAssignedEndTime !== null;

          if (shouldUpdateHours || shouldUpdateTimes) {
               updateEmployeeField(index, {
                  ...assignedEmp,
                  [`assigned_${day}_hours`]: shouldUpdateHours ? suggestedDailyHoursPerEmployeeValue : currentAssignedHours,
                  [`assigned_${day}_start_time`]: shouldUpdateTimes ? null : currentAssignedStartTime, // Clear times for multiple assignments
                  [`assigned_${day}_end_time`]: shouldUpdateTimes ? null : currentAssignedEndTime, // Clear times for multiple assignments
              });
          }
        });
      }
    });
  }, [objects, updateEmployeeField, initialData, dayNames]);


  // Effect to update assignedDailyHours and times for employees and totalEstimatedHours for the order
  useEffect(() => {
    const currentAssignedCount = selectedAssignedEmployees?.length || 0;
    const currentObjectId = form.getValues("objectId") ?? null;

    // Update assignedDailyHours and times for each employee
    if (currentObjectId && currentAssignedCount > 0) {
      distributeDailyHoursAndTimes(currentObjectId, selectedAssignedEmployees || [], !initialData); // Pass true for isInitialLoad if not in edit mode
    } else if (currentAssignedCount === 0) {
        // If no employees assigned, clear all assigned daily hours and times fields
        assignedEmployeeFields.forEach((field, index) => {
            dayNames.forEach(day => {
                const hoursFieldName = `assignedEmployees.${index}.assigned_${day}_hours` as const;
                const startFieldName = `assignedEmployees.${index}.assigned_${day}_start_time` as const;
                const endFieldName = `assignedEmployees.${index}.assigned_${day}_end_time` as const;

                if (field[`assigned_${day}_hours` as keyof typeof field] !== null ||
                    field[`assigned_${day}_start_time` as keyof typeof field] !== null ||
                    field[`assigned_${day}_end_time` as keyof typeof field] !== null) {
                    updateEmployeeField(index, { 
                      ...field, 
                      [hoursFieldName]: null,
                      [startFieldName]: null,
                      [endFieldName]: null,
                    });
                }
            });
        });
    }

    // Update totalEstimatedHours for the order (based on object's total weekly hours or daily hours for one-time)
    const currentTotalEstimatedHours = form.getValues("totalEstimatedHours");
    let newTotalEstimatedHours: number | null = null;

    const selectedObject = objects.find(obj => obj.id === currentObjectId);
    if (selectedObject) {
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        newTotalEstimatedHours = selectedObject.total_weekly_hours || null;
      } else if (orderType === 'one_time' && form.getValues("dueDate")) {
        const dueDate = form.getValues("dueDate");
        const dayOfWeek = dueDate!.getDay();
        let dailyHours = 0;
        switch (dayOfWeek) {
          case 0: dailyHours = selectedObject.sunday_hours || 0; break;
          case 1: dailyHours = selectedObject.monday_hours || 0; break;
          case 2: dailyHours = selectedObject.tuesday_hours || 0; break;
          case 3: dailyHours = selectedObject.wednesday_hours || 0; break;
          case 4: dailyHours = selectedObject.thursday_hours || 0; break;
          case 5: dailyHours = selectedObject.friday_hours || 0; break;
          case 6: dailyHours = selectedObject.saturday_hours || 0; break;
        }
        newTotalEstimatedHours = parseFloat(dailyHours.toFixed(2));
      }
    }

    if (currentTotalEstimatedHours !== newTotalEstimatedHours) {
      form.setValue("totalEstimatedHours", newTotalEstimatedHours, { shouldValidate: false });
    }
  }, [selectedObjectId, selectedAssignedEmployees, objects, form, updateEmployeeField, orderType, form.watch("dueDate"), distributeDailyHoursAndTimes, assignedEmployeeFields, initialData]);


  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    // Manual validation for assigned daily hours sum
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        let validationError = false;
        dayNames.forEach(day => {
          const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
          if (objectDailyHours === null || objectDailyHours === undefined) return;

          let sumAssignedHoursForDay = 0;
          data.assignedEmployees?.forEach(assignedEmp => {
            const assignedHours = assignedEmp[`assigned_${day}_hours` as keyof typeof assignedEmp] as number | null;
            sumAssignedHoursForDay += (assignedHours || 0);
          });

          if (Math.abs(sumAssignedHoursForDay - objectDailyHours) > 0.01) {
            form.setError(`assignedEmployees`, {
              type: "manual",
              message: `Die Summe der zugewiesenen Stunden für ${germanDayNames[day]} (${sumAssignedHoursForDay.toFixed(2)} Std.) muss den Objektstunden (${objectDailyHours.toFixed(2)} Std.) entsprechen.`,
            });
            validationError = true;
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
        removeEmployee();
      }
      onSuccess?.();
    }
  };

  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result);
    if (result.success) {
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, total_weekly_hours, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time');
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

  const handleEmployeeAssignmentChange = (employeeId: string, isChecked: boolean) => {
    const currentAssignedEmployees = form.getValues("assignedEmployees") || [];
    const currentObjectId = form.getValues("objectId") ?? null;
    const selectedObject = objects.find(obj => obj.id === currentObjectId);

    if (isChecked) {
      const newEmployeeAssignment: AssignedEmployee = {
        employeeId: employeeId,
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

      const updatedAssignedEmployees = [...currentAssignedEmployees, newEmployeeAssignment];
      const numAssignedEmployees = updatedAssignedEmployees.length;

      if (selectedObject) {
        dayNames.forEach(day => {
          const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
          const objectStartTime = selectedObject[`${day}_start_time` as keyof typeof selectedObject] as string | null;
          const objectEndTime = selectedObject[`${day}_end_time` as keyof typeof selectedObject] as string | null;

          if (objectDailyHours !== null) {
            if (numAssignedEmployees === 1) {
              newEmployeeAssignment[`assigned_${day}_hours`] = objectDailyHours;
              newEmployeeAssignment[`assigned_${day}_start_time`] = objectStartTime;
              newEmployeeAssignment[`assigned_${day}_end_time`] = objectEndTime;
            } else {
              newEmployeeAssignment[`assigned_${day}_hours`] = parseFloat((objectDailyHours / numAssignedEmployees).toFixed(2));
              newEmployeeAssignment[`assigned_${day}_start_time`] = null; // Clear times for multiple assignments
              newEmployeeAssignment[`assigned_${day}_end_time`] = null; // Clear times for multiple assignments
            }
          }
        });
      }
      appendEmployee(newEmployeeAssignment);

      // Re-distribute hours for all existing employees if adding a new one (and >1 total)
      if (numAssignedEmployees > 1 && selectedObject) {
        const redistributedHours = (day: string) => {
          const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
          return objectDailyHours !== null ? parseFloat((objectDailyHours / numAssignedEmployees).toFixed(2)) : null;
        };

        currentAssignedEmployees.forEach((emp, idx) => {
          const currentField = assignedEmployeeFields.find(f => f.employeeId === emp.employeeId);
          if (currentField) {
            const updatedEmp: AssignedEmployee = { ...currentField };
            dayNames.forEach(day => {
              updatedEmp[`assigned_${day}_hours`] = redistributedHours(day);
              updatedEmp[`assigned_${day}_start_time`] = null;
              updatedEmp[`assigned_${day}_end_time`] = null;
            });
            updateEmployeeField(assignedEmployeeFields.findIndex(f => f.employeeId === emp.employeeId), updatedEmp);
          }
        });
      }

    } else {
      const indexToRemove = assignedEmployeeFields.findIndex(field => field.employeeId === employeeId);
      if (indexToRemove > -1) {
        removeEmployee(indexToRemove);
        const remainingEmployees = currentAssignedEmployees.filter(emp => emp.employeeId !== employeeId);
        const numRemainingEmployees = remainingEmployees.length;

        // Re-distribute hours for remaining employees
        if (numRemainingEmployees > 0 && selectedObject) {
          const redistributedHours = (day: string) => {
            const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] as number | null;
            return objectDailyHours !== null ? parseFloat((objectDailyHours / numRemainingEmployees).toFixed(2)) : null;
          };

          remainingEmployees.forEach((emp, idx) => {
            const currentField = assignedEmployeeFields.find(f => f.employeeId === emp.employeeId);
            if (currentField) {
              const updatedEmp: AssignedEmployee = { ...currentField };
              dayNames.forEach(day => {
                updatedEmp[`assigned_${day}_hours`] = redistributedHours(day);
                updatedEmp[`assigned_${day}_start_time`] = null;
                updatedEmp[`assigned_${day}_end_time`] = null;
              });
              updateEmployeeField(assignedEmployeeFields.findIndex(f => f.employeeId === emp.employeeId), updatedEmp);
            }
          });
        }
      }
    }
  };

  const getSumAssignedHoursForDay = (day: string): number => {
    return (selectedAssignedEmployees || []).reduce((sum, emp) => {
      const assignedHours = emp[`assigned_${day}_hours` as keyof typeof emp] as number | null;
      return sum + (assignedHours || 0);
    }, 0);
  };

  const getObjectDailyHours = (day: string): number | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    return selectedObject ? (selectedObject[`${day}_hours` as keyof typeof selectedObject] as number || null) : null;
  };

  const isDailyHoursValid = (day: string): boolean => {
    const objectHours = getObjectDailyHours(day);
    if (objectHours === null) return true; // No object hours defined, so no validation needed
    const sumAssigned = getSumAssignedHoursForDay(day);
    return Math.abs(sumAssigned - objectHours) < 0.01;
  };

  const isSingleEmployeeAssigned = assignedEmployeeFields.length === 1;

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      {/* Grundlegende Objektinformationen */}
      <div>
        <Label htmlFor="title">Titel des Auftrags</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Wird automatisch generiert"
          disabled={!initialData ? true : false}
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Details zum Auftrag..."
          rows={4}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
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
        {form.formState.errors.serviceType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select onValueChange={(value: string) => {
          form.setValue("customerId", value);
          form.setValue("objectId", null);
          form.setValue("customerContactId", null);
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
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
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
          {form.formState.errors.customerContactId && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>
          )}
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
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="object-create-dialog-title">
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

      {/* Mitarbeiterzuweisung */}
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value: string) => form.setValue("objectId", value)} value={form.watch("objectId") || "unassigned"} disabled={!form.watch("customerId")}>
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
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>

      {/* Mitarbeiterzuweisung */}
      <div className="space-y-2">
        <Label>Zugewiesene Mitarbeiter (optional)</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-96 overflow-y-auto">
          {allEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Mitarbeiter zum Zuweisen gefunden.</p>
          ) : (
            allEmployees.map((employee) => {
              const isAssigned = selectedAssignedEmployees?.some(
                (assigned) => assigned.employeeId === employee.id
              );
              const assignedIndex = assignedEmployeeFields.findIndex(
                (field) => field.employeeId === employee.id
              );

              return (
                <div key={employee.id} className="flex flex-col gap-2 p-2 border-b last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={isAssigned}
                        onCheckedChange={(checked: boolean) =>
                          handleEmployeeAssignmentChange(employee.id, checked)
                        }
                        disabled={!selectedObjectId}
                      />
                      <Label htmlFor={`employee-${employee.id}`} className="flex-grow">
                        {employee.first_name} {employee.last_name}
                      </Label>
                    </div>
                    {isAssigned && assignedIndex !== -1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmployee(assignedIndex)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isAssigned && assignedIndex !== -1 && (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {/* Hours input for single or multiple employees */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                        {dayNames.map(day => {
                          const hoursFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_hours` as const;
                          const objectDailyHours = getObjectDailyHours(day);
                          const isDayValid = isDailyHoursValid(day); // Check overall validity for the day

                          return (
                            <div key={day}>
                              <Label htmlFor={hoursFieldName} className="text-xs font-medium">
                                {germanDayNames[day]} {objectDailyHours !== null ? `(${objectDailyHours.toFixed(1)}h)` : ''}
                              </Label>
                              <Input
                                id={hoursFieldName}
                                type="number"
                                step="0.5"
                                placeholder="Std."
                                className={cn(
                                  "w-full text-right",
                                  !isDayValid && "border-destructive focus-visible:ring-destructive" // Highlight if sum is invalid
                                )}
                                {...form.register(hoursFieldName as FieldPath<OrderFormValues>, { valueAsNumber: true })}
                                disabled={!selectedObjectId || isSingleEmployeeAssigned} // Disable if no object or single employee
                                readOnly={isSingleEmployeeAssigned} // Readonly if single employee
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* Time inputs for single employee */}
                      {isSingleEmployeeAssigned && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-2">
                          {dayNames.map(day => {
                            const startFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_start_time` as const;
                            const endFieldName = `assignedEmployees.${assignedIndex}.assigned_${day}_end_time` as const;
                            const objectStartTime = objects.find(obj => obj.id === selectedObjectId)?.[`${day}_start_time` as keyof typeof objects[0]] as string | null;
                            const objectEndTime = objects.find(obj => obj.id === selectedObjectId)?.[`${day}_end_time` as keyof typeof objects[0]] as string | null;

                            return (
                              <div key={`${day}-times`}>
                                <Label htmlFor={startFieldName} className="text-xs">Start</Label>
                                <Input
                                  id={startFieldName}
                                  type="time"
                                  className="w-full"
                                  disabled={true} // Always disabled for single employee, derived from object
                                  readOnly={true}
                                  value={objectStartTime || ''} // Display object's start time
                                />
                                <Label htmlFor={endFieldName} className="text-xs mt-1">Ende</Label>
                                <Input
                                  id={endFieldName}
                                  type="time"
                                  className="w-full"
                                  disabled={true} // Always disabled for single employee, derived from object
                                  readOnly={true}
                                  value={objectEndTime || ''} // Display object's end time
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {form.formState.errors.assignedEmployees && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees.message}</p>
        )}
        {!selectedObjectId && (
            <p className="text-muted-foreground text-sm mt-1">Bitte wählen Sie zuerst ein Objekt aus, um Mitarbeiter zuzuweisen.</p>
        )}
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
        {form.formState.errors.orderType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
        )}
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
        {form.formState.errors.priority && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="totalEstimatedHours">Geschätzte Stunden (optional)</Label>
        <Input
          id="totalEstimatedHours"
          type="number"
          step="0.5"
          {...form.register("totalEstimatedHours")}
          placeholder="Z.B. 2.5"
          readOnly
          className="bg-muted cursor-not-allowed"
        />
        {form.formState.errors.totalEstimatedHours && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.totalEstimatedHours.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche Notizen zum Auftrag..."
          rows={3}
        />
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
        )}
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
        {form.formState.errors.status && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
        )}
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
        {form.formState.errors.requestStatus && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.requestStatus.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}