"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle } from "lucide-react"; // PlusCircle-Icon hinzugefügt
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client"; // Importiere Supabase Client
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Dialog-Komponenten
import { ObjectForm, ObjectFormValues } from "@/components/object-form"; // ObjectForm importieren
import { createObject } from "@/app/dashboard/objects/actions"; // createObject-Aktion importieren

// Definierte Liste der Dienstleistungen
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const; // 'as const' für String-Literal-Typen

export const orderSchema = z.object({ // taskSchema zu orderSchema
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  dueDate: z.date().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"), // Neue Felder
  objectId: z.string().uuid("Ungültige Objekt-ID").min(1, "Objekt ist erforderlich"),   // Neue Felder
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(), // Optional
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(), // Neues Feld
  // Neue Felder für Auftragstypen und Details
  orderType: z.enum(["one_time", "recurring", "substitution", "permanent"]).default("one_time"), // 'permanent' hinzugefügt
  recurringStartDate: z.date().optional().nullable(),
  recurringEndDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("low"),
  estimatedHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(), // Neues Feld als Enum der verfügbaren Services
});

export type OrderFormInput = z.input<typeof orderSchema>; // TaskFormInput zu OrderFormInput
export type OrderFormValues = z.infer<typeof orderSchema>; // TaskFormValues zu OrderFormValues

interface OrderFormProps { // TaskFormProps zu OrderFormProps
  initialData?: Partial<OrderFormInput>;
  onSubmit: (data: OrderFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function OrderForm({ initialData, onSubmit, submitButtonText, onSuccess }: OrderFormProps) { // TaskForm zu OrderForm
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]); // State für Kundenkontakte
  const [isNewObjectDialogOpen, setIsNewObjectDialogOpen] = useState(false); // State für Dialog

  const resolvedDefaultValues: OrderFormValues = {
    title: initialData?.title ?? "",
    description: initialData?.description ?? null,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    status: initialData?.status ?? "pending",
    customerId: initialData?.customerId ?? "",
    objectId: initialData?.objectId ?? "",
    employeeId: initialData?.employeeId ?? null,
    customerContactId: initialData?.customerContactId ?? null, // Initialwert für neues Feld
    orderType: initialData?.orderType ?? "one_time",
    recurringStartDate: initialData?.recurringStartDate ? new Date(initialData.recurringStartDate) : null,
    recurringEndDate: initialData?.recurringEndDate ? new Date(initialData.recurringEndDate) : null,
    priority: initialData?.priority ?? "low",
    estimatedHours: (initialData?.estimatedHours as number | null | undefined) ?? null, // Fix: Explizites Casting
    notes: initialData?.notes ?? null,
    serviceType: initialData?.serviceType ?? null, // Initialwert für neues Feld
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema as z.ZodSchema<OrderFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const [displayDueDate, setDisplayDueDate] = useState<string | undefined>(undefined);
  const [displayRecurringStartDate, setDisplayRecurringStartDate] = useState<string | undefined>(undefined);
  const [displayRecurringEndDate, setDisplayRecurringEndDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (form.watch("dueDate")) {
      setDisplayDueDate(format(form.watch("dueDate")!, "PPP"));
    } else {
      setDisplayDueDate(undefined);
    }
  }, [form.watch("dueDate")]);

  useEffect(() => {
    if (form.watch("recurringStartDate")) {
      setDisplayRecurringStartDate(format(form.watch("recurringStartDate")!, "PPP"));
    } else {
      setDisplayRecurringStartDate(undefined);
    }
  }, [form.watch("recurringStartDate")]);

  useEffect(() => {
    if (form.watch("recurringEndDate")) {
      setDisplayRecurringEndDate(format(form.watch("recurringEndDate")!, "PPP"));
    } else {
      setDisplayRecurringEndDate(undefined);
    }
  }, [form.watch("recurringEndDate")]);

  // Watch orderType and customerId to conditionally render fields and filter contacts
  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");

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
    const fetchCustomerContacts = async () => {
      if (selectedCustomerId) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, customer_id')
          .eq('customer_id', selectedCustomerId)
          .order('last_name', { ascending: true });
        if (contactsData) setCustomerContacts(contactsData);
        if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
      } else {
        setCustomerContacts([]); // Kontakte leeren, wenn kein Kunde ausgewählt ist
        form.setValue("customerContactId", null); // Kundenkontakt zurücksetzen
      }
    };
    fetchCustomerContacts();
  }, [selectedCustomerId, supabase, form]);

  // Objekte filtern basierend auf ausgewähltem Kunden
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  // Handler für die Objekterstellung im Dialog
  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    if (result.success) {
      // Objektliste neu laden und neues Objekt auswählen
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id');
      if (newObjectsData) {
        setObjects(newObjectsData);
        // Versuche, das neu erstellte Objekt im Dropdown auszuwählen
        const newObject = newObjectsData.find(obj => obj.name === data.name && obj.customer_id === data.customerId);
        if (newObject) {
          form.setValue("objectId", newObject.id);
        }
      }
      if (newObjectsError) console.error("Fehler beim Neuladen der Objekte:", newObjectsError);
      setIsNewObjectDialogOpen(false); // Dialog schließen
    }
    return result;
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
      <div>
        <Label htmlFor="title">Titel des Auftrags</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Z.B. Büroreinigung"
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
        <Label htmlFor="serviceType">Reinigungsdienstleistung</Label> {/* Neues Feld */}
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
          form.setValue("objectId", ""); // Objekt zurücksetzen, wenn Kunde geändert wird
          form.setValue("customerContactId", null); // Kundenkontakt zurücksetzen, wenn Kunde geändert wird
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
      <div>
        <Label htmlFor="customerContactId">Auftraggebende Person (Kundenkontakt, optional)</Label>
        <Select onValueChange={(value) => form.setValue("customerContactId", value === "unassigned" ? null : value)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
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
      <div className="flex items-end gap-2"> {/* Flex-Container für Label, Select und Button */}
        <div className="flex-grow">
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId")} disabled={!form.watch("customerId")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Objekt auswählen" />
            </SelectTrigger>
            <SelectContent>
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
              type="button" // Wichtig, damit es das Formular nicht absendet
              variant="outline"
              size="icon"
              className="mb-1" // Kleiner Abstand nach unten
              disabled={!form.watch("customerId")} // Deaktivieren, wenn kein Kunde ausgewählt ist
              title={!form.watch("customerId") ? "Bitte zuerst einen Kunden auswählen" : "Neues Objekt für diesen Kunden erstellen"}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Neues Objekt erstellen</DialogTitle>
            </DialogHeader>
            <ObjectForm
              initialData={{ customerId: form.watch("customerId") }} // Kunden-ID übergeben
              onSubmit={handleCreateObject}
              submitButtonText="Objekt erstellen"
              onSuccess={() => setIsNewObjectDialogOpen(false)} // Dialog schließen bei Erfolg
            />
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <Label htmlFor="employeeId">Zugewiesener Mitarbeiter (optional)</Label>
        <Select onValueChange={(value) => form.setValue("employeeId", value === "unassigned" ? null : value)} value={form.watch("employeeId") || "unassigned"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem> {/* Wert geändert */}
            {employees.map(employee => (
              <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="orderType">Auftragstyp</Label>
        <Select onValueChange={(value) => {
          form.setValue("orderType", value as OrderFormValues["orderType"]);
          // Reset date fields when order type changes
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
            <SelectItem value="permanent">Permanent</SelectItem> {/* Neuer Typ */}
          </SelectContent>
        </Select>
        {form.formState.errors.orderType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
        )}
      </div>

      {orderType === "one_time" && (
        <div>
          <Label htmlFor="dueDate">Fälligkeitsdatum (optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("dueDate") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDueDate ? displayDueDate : <span>Datum auswählen</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch("dueDate") || undefined}
                onSelect={(date) => form.setValue("dueDate", date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.dueDate && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
          )}
        </div>
      )}

      {(orderType === "recurring" || orderType === "substitution" || orderType === "permanent") && (
        <>
          <div>
            <Label htmlFor="recurringStartDate">Startdatum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("recurringStartDate") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayRecurringStartDate ? displayRecurringStartDate : <span>Datum auswählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("recurringStartDate") || undefined}
                  onSelect={(date) => form.setValue("recurringStartDate", date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.recurringStartDate && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.recurringStartDate.message}</p>
            )}
          </div>
          {orderType !== "permanent" && ( // Enddatum nur für recurring und substitution
            <div>
              <Label htmlFor="recurringEndDate">Enddatum (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("recurringEndDate") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayRecurringEndDate ? displayRecurringEndDate : <span>Datum auswählen</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("recurringEndDate") || undefined}
                    onSelect={(date) => form.setValue("recurringEndDate", date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.recurringEndDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.recurringEndDate.message}</p>
              )}
            </div>
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
        <Label htmlFor="estimatedHours">Geschätzte Stunden (optional)</Label>
        <Input
          id="estimatedHours"
          type="number"
          step="0.5"
          {...form.register("estimatedHours")}
          placeholder="Z.B. 2.5"
        />
        {form.formState.errors.estimatedHours && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.estimatedHours.message}</p>
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
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}