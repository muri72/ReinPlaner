"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react"; // Added Trash2
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

// Definierte Liste der Dienstleistungen
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

const employeeAssignmentSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assignedDailyHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0.1, "Stunden müssen positiv sein").max(24, "Stunden sind zu hoch")).optional()
  ),
});

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
  totalEstimatedHours: z.preprocess( // Renamed from estimatedHours
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(9999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(),
  requestStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  
  // New fields for multi-employee assignment
  assignedEmployeeIds: z.array(z.string().uuid()).optional(),
  employeeAssignments: z.array(employeeAssignmentSchema).optional(),
  distributeEqually: z.boolean().default(true), // New field for equal distribution toggle
}).superRefine((data, ctx) => {
  if (data.assignedEmployeeIds && data.assignedEmployeeIds.length > 0 && !data.distributeEqually) {
    // If not distributing equally, ensure all assigned employees have individual hours defined
    for (const empId of data.assignedEmployeeIds) {
      const assignment = data.employeeAssignments?.find(ea => ea.employeeId === empId);
      if (!assignment || (assignment.assignedDailyHours ?? 0) <= 0) { // Fixed: Use nullish coalescing for comparison
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Individuelle Stunden für zugewiesenen Mitarbeiter sind erforderlich.`,
          path: [`employeeAssignments`], // Point to the array for a general error
        });
        break;
      }
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
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
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
    totalEstimatedHours: (initialData?.totalEstimatedHours as number | null | undefined) ?? null, // Use new column
    notes: initialData?.notes ?? null,
    serviceType: initialData?.serviceType ?? null,
    requestStatus: initialData?.requestStatus ?? "approved",
    assignedEmployeeIds: initialData?.assignedEmployeeIds ?? [], // Initialize new field
    employeeAssignments: (initialData?.employeeAssignments as OrderFormValues['employeeAssignments']) ?? [], // Fixed: Explicitly cast to correct type
    distributeEqually: initialData?.distributeEqually ?? true, // Initialize new field
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema as z.ZodSchema<OrderFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const assignedEmployeeIds = form.watch("assignedEmployeeIds");
  const employeeAssignments = form.watch("employeeAssignments");
  const distributeEqually = form.watch("distributeEqually");
  const totalEstimatedHours = form.watch("totalEstimatedHours");

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

      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id');
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name');
      if (employeesData) setEmployees(employeesData);
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
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name || '';
      const objectName = objects.find(o => o.id === selectedObjectId)?.name || '';
      
      const assignedEmployeeNames = assignedEmployeeIds?.map(empId => {
        const employee = employees.find(e => e.id === empId);
        return employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : '';
      }).filter(Boolean).join(', ');

      const parts = [];
      if (objectName) parts.push(objectName);
      if (customerName) parts.push(customerName);
      if (assignedEmployeeNames) parts.push(assignedEmployeeNames);

      const generatedTitle = parts.join(' • ');
      form.setValue("title", generatedTitle);
    }
  }, [selectedCustomerId, selectedObjectId, assignedEmployeeIds, customers, objects, employees, form, initialData]);

  // Objekte filtern basierend auf ausgewähltem Kunden
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    const result = await onSubmit(data);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    }
  };

  // Handler für die Objekterstellung im Dialog
  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result); // Nutze die neue Utility
    if (result.success) {
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id');
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

  // Handler für die Kundenkontakterstellung im Dialog
  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId); // Liste der Kontakte neu laden
      form.setValue("customerContactId", newContactId); // Neu erstellten Kontakt auswählen
    }
  };

  const handleEmployeeSelection = (employeeId: string, isChecked: boolean) => {
    const currentAssignedIds = form.getValues("assignedEmployeeIds") || [];
    const currentAssignments = form.getValues("employeeAssignments") || [];

    if (isChecked) {
      form.setValue("assignedEmployeeIds", [...currentAssignedIds, employeeId]);
      // Add a placeholder for individual hours if not distributing equally
      if (!distributeEqually) {
        form.setValue("employeeAssignments", [...currentAssignments, { employeeId, assignedDailyHours: null }]);
      }
    } else {
      form.setValue("assignedEmployeeIds", currentAssignedIds.filter(id => id !== employeeId));
      form.setValue("employeeAssignments", currentAssignments.filter(ea => ea.employeeId !== employeeId));
    }
  };

  const handleIndividualHoursChange = (employeeId: string, value: string) => {
    const parsedHours = value === "" ? null : Number(value);
    const currentAssignments = form.getValues("employeeAssignments") || [];
    const updatedAssignments = currentAssignments.map(ea =>
      ea.employeeId === employeeId ? { ...ea, assignedDailyHours: parsedHours } : ea
    );
    form.setValue("employeeAssignments", updatedAssignments, { shouldValidate: true });
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
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
        <Select onValueChange={(value) => form.setValue("serviceType", value as OrderFormValues["serviceType"])} value={form.watch("serviceType") || ""}>
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
        <Select onValueChange={(value) => {
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
          <Select onValueChange={(v) => form.setValue("customerContactId", v === "unassigned" ? null : v)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
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
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId") || "unassigned"} disabled={!form.watch("customerId")}>
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
        <CustomerContactCreateDialog
          customerId={selectedCustomerId}
          onContactCreated={handleCustomerContactCreated}
          disabled={!selectedCustomerId}
        />
      </div>

      {/* Multi-Employee Assignment */}
      <h3 className="text-lg font-semibold mt-6">Zugewiesene Mitarbeiter</h3>
      <div className="space-y-2">
        <Label>Mitarbeiter auswählen</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
          {employees.length === 0 ? (
            <p className="col-span-full text-muted-foreground text-sm">Keine Mitarbeiter verfügbar.</p>
          ) : (
            employees.map(employee => (
              <div key={employee.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`employee-${employee.id}`}
                  checked={assignedEmployeeIds?.includes(employee.id)}
                  onCheckedChange={(checked) => handleEmployeeSelection(employee.id, checked as boolean)}
                />
                <Label htmlFor={`employee-${employee.id}`}>{employee.first_name} {employee.last_name}</Label>
              </div>
            ))
          )}
        </div>
        {form.formState.errors.assignedEmployeeIds && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployeeIds.message}</p>
        )}
      </div>

      {assignedEmployeeIds && assignedEmployeeIds.length > 0 && (
        <div className="space-y-2 border-t pt-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="distributeEqually"
              checked={distributeEqually}
              onCheckedChange={(checked) => form.setValue("distributeEqually", checked as boolean)}
            />
            <Label htmlFor="distributeEqually">Stunden gleichmäßig aufteilen</Label>
          </div>

          {!distributeEqually && (
            <div className="space-y-2 mt-4">
              <Label>Individuelle Stunden pro Mitarbeiter (Netto-Stunden pro Tag)</Label>
              {assignedEmployeeIds.map(empId => {
                const employee = employees.find(e => e.id === empId);
                const currentAssignedHours = employeeAssignments?.find(ea => ea.employeeId === empId)?.assignedDailyHours;
                return (
                  <div key={empId} className="flex items-center gap-2">
                    <Label className="w-32 flex-shrink-0">{employee?.first_name} {employee?.last_name}:</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentAssignedHours !== null ? currentAssignedHours : ''}
                      onChange={(e) => handleIndividualHoursChange(empId, e.target.value)}
                      placeholder="Stunden"
                      className="flex-grow"
                    />
                  </div>
                );
              })}
              {form.formState.errors.employeeAssignments && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeAssignments.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="totalEstimatedHours">Geschätzte Gesamtstunden (optional)</Label>
        <Input
          id="totalEstimatedHours"
          type="number"
          step="0.5"
          {...form.register("totalEstimatedHours")}
          placeholder="Z.B. 2.5"
        />
        {form.formState.errors.totalEstimatedHours && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.totalEstimatedHours.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="orderType">Auftragstyp</Label>
        <Select onValueChange={(value) => {
          form.setValue("orderType", value as OrderFormValues["orderType"]);
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
          onChange={(date) => form.setValue("dueDate", date)}
          error={form.formState.errors.dueDate?.message}
        />
      )}

      {(orderType === "recurring" || orderType === "substitution" || orderType === "permanent") && (
        <>
          <DatePicker
            label="Startdatum"
            value={form.watch("recurringStartDate")}
            onChange={(date) => form.setValue("recurringStartDate", date)}
            error={form.formState.errors.recurringStartDate?.message}
          />
          {orderType !== "permanent" && (
            <DatePicker
              label="Enddatum (optional)"
              value={form.watch("recurringEndDate")}
              onChange={(date) => form.setValue("recurringEndDate", date)}
              error={form.formState.errors.recurringEndDate?.message}
            />
          )}
        </>
      )}

      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select onValueChange={(value) => form.setValue("priority", value as OrderFormValues["priority"])} value={form.watch("priority")}>
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
        <Select onValueChange={(value) => form.setValue("status", value as "pending" | "in_progress" | "completed")} value={form.watch("status")}>
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
        <Select onValueChange={(value) => form.setValue("requestStatus", value as "pending" | "approved" | "rejected")} value={form.watch("requestStatus")}>
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