"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
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
  totalEstimatedHours: z.preprocess( // Corrected column name
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(),
  requestStatus: z.enum(["pending", "approved", "rejected"]).default("approved"), // Neues Feld
  // Neues Feld für Mitarbeiterzuweisungen
  assignedEmployees: z.array(z.object({
    employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
    assignedDailyHours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(24, "Stunden sind zu hoch")).optional()),
  })).optional(),
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
    total_weekly_hours: number | null; // Ensure this is fetched
  }[]>([]); // Objekt-Stunden hinzugefügt
  const [allEmployees, setAllEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]); // Alle Mitarbeiter
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
    assignedEmployees: (initialData?.assignedEmployees as { employeeId: string; assignedDailyHours?: number | null }[] | undefined) ?? [], // Initialwert für zugewiesene Mitarbeiter
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema as z.ZodSchema<OrderFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const { fields: assignedEmployeeFields, append: appendEmployee, remove: removeEmployee, update: updateEmployeeField } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const selectedAssignedEmployees = form.watch("assignedEmployees"); // Watch the assigned employees array

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

      // Alle Objekt-Details laden, einschließlich der Stunden pro Wochentag
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, total_weekly_hours');
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
    if (!initialData) { // Nur wenn ein neuer Auftrag erstellt wird
      const customerName = customers.find((c: { id: string; name: string }) => c.id === selectedCustomerId)?.name || '';
      const objectName = objects.find((o: { id: string; name: string }) => o.id === selectedObjectId)?.name || '';

      const parts = [];
      if (objectName) parts.push(objectName);
      if (customerName) parts.push(customerName);

      const generatedTitle = parts.join(' • ');
      form.setValue("title", generatedTitle);
    }
  }, [selectedCustomerId, selectedObjectId, customers, objects, form, initialData]);

  // Objekte filtern basierend auf ausgewähltem Kunden
  const filteredObjects = selectedCustomerId
    ? objects.filter((obj: { customer_id: string }) => obj.customer_id === selectedCustomerId)
    : [];

  // Calculate suggested daily hours per employee based on object's total weekly hours
  const calculateSuggestedDailyHoursPerEmployee = useCallback((objectId: string | null, employeeCount: number): number | null => {
    if (!objectId || employeeCount === 0) return null;
    const selectedObject = objects.find((obj: { id: string }) => obj.id === objectId);
    if (!selectedObject || selectedObject.total_weekly_hours === null) return null;

    // Divide total weekly hours by the number of assigned employees
    const suggested = selectedObject.total_weekly_hours / employeeCount;
    return parseFloat(suggested.toFixed(2));
  }, [objects]);

  // Effect to update assignedDailyHours for employees and totalEstimatedHours for the order
  useEffect(() => {
    const currentAssignedCount = selectedAssignedEmployees?.length || 0;
    const currentObjectId = form.getValues("objectId") ?? null;

    // Update assignedDailyHours for each employee
    if (currentObjectId && currentAssignedCount > 0) {
      const suggestedDailyHours = calculateSuggestedDailyHoursPerEmployee(currentObjectId, currentAssignedCount);
      selectedAssignedEmployees?.forEach((assignedEmp: { employeeId: string; assignedDailyHours?: number | null }, index: number) => {
        // Only update if the field is not already manually set or if it's a new assignment
        // For simplicity, we'll always update it here. If a user manually changes it,
        // adding/removing another employee will re-calculate and overwrite.
        updateEmployeeField(index, { ...assignedEmp, assignedDailyHours: suggestedDailyHours });
      });
    } else {
      // If no object or no employees assigned, reset all assigned daily hours
      selectedAssignedEmployees?.forEach((assignedEmp: { employeeId: string; assignedDailyHours?: number | null }, index: number) => {
        if (assignedEmp.assignedDailyHours !== null) {
          updateEmployeeField(index, { ...assignedEmp, assignedDailyHours: null });
        }
      });
    }

    // Update totalEstimatedHours for the order (based on object's total weekly hours or daily hours for one-time)
    const selectedObject = objects.find((obj: { id: string }) => obj.id === currentObjectId);
    if (selectedObject) {
      if (['recurring', 'substitution', 'permanent'].includes(orderType)) {
        form.setValue("totalEstimatedHours", selectedObject.total_weekly_hours || null, { shouldValidate: false });
      } else if (orderType === 'one_time' && form.getValues("dueDate")) {
        const dueDate = form.getValues("dueDate");
        const dayOfWeek = dueDate!.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
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
        form.setValue("totalEstimatedHours", parseFloat(dailyHours.toFixed(2)), { shouldValidate: false });
      } else {
        form.setValue("totalEstimatedHours", null, { shouldValidate: false });
      }
    } else {
      form.setValue("totalEstimatedHours", null, { shouldValidate: false });
    }
  }, [selectedObjectId, selectedAssignedEmployees, calculateSuggestedDailyHoursPerEmployee, objects, form, updateEmployeeField, orderType, form.watch("dueDate")]);


  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    const result = await onSubmit(data);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      if (!initialData) {
        form.reset();
        removeEmployee(); // Alle zugewiesenen Mitarbeiter entfernen
      }
      onSuccess?.();
    }
  };

  // Handler für die Objekterstellung im Dialog
  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result); // Nutze die neue Utility
    if (result.success) {
      // Fetch all object details including daily hours and total weekly hours after creation
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, total_weekly_hours');
      if (newObjectsData) {
        setObjects(newObjectsData);
        const newObject = newObjectsData.find((obj: { name: string; customer_id: string }) => obj.name === data.name && obj.customer_id === data.customerId);
        if (newObject) {
          form.setValue("objectId", newObject.id);
        }
      }
      if (newObjectsError) console.error("Fehler beim Neuladen der Objekte:", newObjectsError);
      setIsNewObjectDialogOpen(false);
    }
    return result;
  };

  // Handler für die Kundenkontakterstellung im Dialog
  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId); // Liste der Kontakte neu laden
      form.setValue("customerContactId", newContactId); // Neu erstellten Kontakt auswählen
    }
  };

  const handleEmployeeAssignmentChange = (employeeId: string, isChecked: boolean) => {
    if (isChecked) {
      // When an employee is assigned, calculate suggested hours based on current state
      const currentAssignedCount = (selectedAssignedEmployees?.length || 0) + 1; // Include the new employee
      const suggested = calculateSuggestedDailyHoursPerEmployee(form.getValues("objectId") ?? null, currentAssignedCount);
      appendEmployee({ employeeId: employeeId, assignedDailyHours: suggested });
    } else {
      const index = assignedEmployeeFields.findIndex((field: { employeeId: string }) => field.employeeId === employeeId);
      if (index > -1) {
        removeEmployee(index);
      }
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
      {/* Grundlegende Objektinformationen */}
      <div>
        <Label htmlFor="title">Titel des Auftrags</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Wird automatisch generiert"
          disabled={!initialData ? true : false} // Deaktiviert, wenn neuer Auftrag erstellt wird
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
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>
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
      <div className="space-y-2">
        <Label>Zugewiesene Mitarbeiter (optional)</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
          {allEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Mitarbeiter zum Zuweisen gefunden.</p>
          ) : (
            allEmployees.map((employee: { id: string; first_name: string; last_name: string }) => {
              const isAssigned = selectedAssignedEmployees?.some(
                (assigned: { employeeId: string }) => assigned.employeeId === employee.id
              );
              const assignedIndex = assignedEmployeeFields.findIndex(
                (field: { employeeId: string }) => field.employeeId === employee.id
              );

              // Calculate suggested daily hours for this specific employee's placeholder
              const currentAssignedCountForPlaceholder = (selectedAssignedEmployees?.length || 0);
              const suggestedForPlaceholder = calculateSuggestedDailyHoursPerEmployee(form.getValues("objectId") ?? null, currentAssignedCountForPlaceholder);

              return (
                <div key={employee.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={isAssigned}
                      onCheckedChange={(checked: boolean) =>
                        handleEmployeeAssignmentChange(employee.id, checked)
                      }
                    />
                    <Label htmlFor={`employee-${employee.id}`} className="flex-grow">
                      {employee.first_name} {employee.last_name}
                    </Label>
                  </div>
                  {isAssigned && assignedIndex !== -1 && (
                    <div className="flex items-center gap-1">
                      <Label htmlFor={`assignedEmployees.${assignedIndex}.assignedDailyHours`} className="sr-only">Tägliche Stunden für {employee.first_name}</Label>
                      <Input
                        id={`assignedEmployees.${assignedIndex}.assignedDailyHours`}
                        type="number"
                        step="0.5"
                        placeholder={suggestedForPlaceholder !== null ? `Vorschlag: ${suggestedForPlaceholder}` : "Std. / Tag"}
                        className="w-24 text-right"
                        {...form.register(`assignedEmployees.${assignedIndex}.assignedDailyHours`, { valueAsNumber: true })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmployee(assignedIndex)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
            {availableServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
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
          readOnly // Macht das Feld schreibgeschützt
          className="bg-muted cursor-not-allowed" // Visuelle Indikation für schreibgeschützt
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