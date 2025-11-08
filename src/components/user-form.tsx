"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox"; // For multi-select
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

// Define the base schema first to avoid circular dependency
const baseUserSchema = z.object({
  email: z.union([
    z.string().email("Ungültiges E-Mail-Format"),
    z.literal(""), // Erlaube leeren String
  ]).transform(e => e === "" ? null : e).optional().nullable(),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein").optional(), // Optional for updates
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  role: z.enum(["admin", "manager", "employee", "customer"]).default("employee"),
  // These are only for NEW user creation, not for editing existing users
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(), // This is now primarily a filter
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(), // Neues Feld für Kundenkontakt
  managerCustomerIds: z.array(z.string().uuid()).optional(), // For manager role
});

// Now define the types based on the base schema
export type UserFormInput = z.input<typeof baseUserSchema>;
export type UserFormValues = z.infer<typeof baseUserSchema>;

// Apply refine methods to the base schema
export const userSchema = baseUserSchema
.refine((data) => {
  // Rule 1: Email is required for new users if no direct assignment (employee or customer contact)
  if (data.password !== undefined && !data.employeeId && !data.customerContactId) {
    return data.email !== null && data.email !== "";
  }
  return true;
}, {
  message: "E-Mail ist erforderlich, wenn kein Mitarbeiter oder Kundenkontakt zugewiesen ist.",
  path: ["email"],
})
.refine((data) => {
  if (data.password !== undefined) { // Only for new users
    // Rule 2: A user can be linked to AT MOST one of employeeId or customerContactId.
    // customerId is just a filter for customerContactId, not a direct assignment for the user.
    const directAssignments = [data.employeeId, data.customerContactId].filter(Boolean);
    if (directAssignments.length > 1) {
      return false; // Cannot be both an employee and a customer contact
    }

    // Rule 3: If a customer contact is assigned, the role MUST be 'customer'.
    if (data.customerContactId && data.role !== 'customer') {
      return false;
    }

    // Rule 4: If the role is NOT 'manager', then managerCustomerIds should be empty.
    if (data.role !== 'manager' && data.managerCustomerIds && data.managerCustomerIds.length > 0) {
      return false;
    }

    // No specific role restriction for employeeId anymore.
    // A user can be linked to an employee (any role: admin, manager, employee, customer).
    // A user linked to a customer contact must be 'customer'.
    // A user not linked to anything can be admin, manager, employee, customer.
  }
  return true;
}, {
  message: "Ungültige Rollen- und Zuweisungskombination.",
  path: ["role"],
});


interface UserFormProps {
  initialData?: Partial<UserFormInput> & {
    employee?: { id: string; first_name: string; last_name: string } | null;
    customerContact?: { id: string; first_name: string; last_name: string; customer_id: string } | null;
  };
  onSubmit: (data: UserFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
}

export function UserForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false }: UserFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null; email: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; user_id: string | null; contact_email: string | null }[]>([]);
  const [customerContactsForUserAssignment, setCustomerContactsForUserAssignment] = useState<{ id: string; first_name: string; last_name: string; email: string | null; customer_id: string; user_id: string | null }[]>([]); // State für Kundenkontakte zur Zuweisung
  const [allCustomersForManager, setAllCustomersForManager] = useState<{ id: string; name: string }[]>([]); // For manager assignment
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const resolvedDefaultValues: UserFormValues = {
    email: initialData?.email ?? null, // Set to null if undefined
    password: initialData?.password ?? (isEditMode ? undefined : ""),
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    role: initialData?.role ?? "employee",
    // These initialData values are used for both new user creation and editing
    employeeId: initialData?.employeeId ?? initialData?.employee?.id ?? null,
    customerId: initialData?.customerId ?? initialData?.customerContact?.customer_id ?? null,
    customerContactId: initialData?.customerContactId ?? initialData?.customerContact?.id ?? null, // Neues Feld für Kundenkontakt
    managerCustomerIds: initialData?.managerCustomerIds ?? [],
  };

  const form = useForm<UserFormInput>({
    resolver: zodResolver(userSchema),
    defaultValues: resolvedDefaultValues,
    mode: "onSubmit",
  });

  const selectedRole = form.watch("role");
  const selectedEmployeeId = form.watch("employeeId");
  const selectedCustomerId = form.watch("customerId");
  const selectedCustomerContactId = form.watch("customerContactId"); // Neues Watch-Feld

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDropdowns(true);
      // Fetch all employees (not just unassigned) for new user creation
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id, email')
        .order('last_name', { ascending: true });

      if (employeesError) {
        console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
        toast.error("Fehler beim Laden der Mitarbeiter.");
      }
      setEmployees(employeesData || []);

      // Fetch all customers (not just unassigned) for new user creation
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, user_id, contact_email')
        .order('name', { ascending: true });

      if (customersError) {
        console.error("Fehler beim Laden der Kunden:", customersError);
        toast.error("Fehler beim Laden der Kunden.");
      }
      setCustomers(customersData || []);

      // Fetch ALL customers for manager assignment (if applicable)
      const { data: allCustomersData, error: allCustomersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (allCustomersError) {
        console.error("Fehler beim Laden aller Kunden für Manager-Zuweisung:", allCustomersError);
        toast.error("Fehler beim Laden aller Kunden für Manager-Zuweisung.");
      }
      setAllCustomersForManager(allCustomersData || []);

      setLoadingDropdowns(false);
    };
    fetchData();
  }, [supabase]);

  // Effect to fetch customer contacts when a customer is selected
  useEffect(() => {
    const fetchContacts = async () => {
      if (selectedCustomerId) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, email, customer_id, user_id')
          .eq('customer_id', selectedCustomerId)
          .order('last_name', { ascending: true });

        if (contactsError) {
          console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
          toast.error("Fehler beim Laden der Kundenkontakte.");
        }
        setCustomerContactsForUserAssignment(contactsData || []);
      } else {
        setCustomerContactsForUserAssignment([]);
        form.setValue("customerContactId", null, { shouldValidate: false });
      }
    };
    fetchContacts();
  }, [selectedCustomerId, supabase, form]);


  // Effect to handle changes in employee/customer/customerContact selection for auto-populating fields
  useEffect(() => {
    if (!isEditMode) {
      // Reset fields if no assignment is selected
      if (!selectedEmployeeId && !selectedCustomerId && !selectedCustomerContactId) {
        form.setValue("firstName", initialData?.firstName || "", { shouldValidate: false });
        form.setValue("lastName", initialData?.lastName || "", { shouldValidate: false });
        form.setValue("email", initialData?.email || null, { shouldValidate: false });
        form.setValue("role", initialData?.role || "employee", { shouldValidate: false }); // Default role
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      }

      if (selectedEmployeeId) {
        const employee = employees.find(emp => emp.id === selectedEmployeeId);
        form.setValue("firstName", employee?.first_name || "", { shouldValidate: false });
        form.setValue("lastName", employee?.last_name || "", { shouldValidate: false });
        form.setValue("email", employee?.email || null, { shouldValidate: false });
        // DO NOT set role here. Let the user choose.
        form.setValue("customerId", null, { shouldValidate: false }); // Clear other assignments
        form.setValue("customerContactId", null, { shouldValidate: false }); // Clear other assignments
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      } else if (selectedCustomerContactId) { // Prioritize customer contact if selected
        const contact = customerContactsForUserAssignment.find(c => c.id === selectedCustomerContactId);
        form.setValue("firstName", contact?.first_name || "", { shouldValidate: false });
        form.setValue("lastName", contact?.last_name || "", { shouldValidate: false });
        form.setValue("email", contact?.email || null, { shouldValidate: false });
        form.setValue("role", "customer", { shouldValidate: false }); // Keep setting role to 'customer' for contacts
        form.setValue("employeeId", null, { shouldValidate: false }); // Clear other assignments
        form.setValue("customerId", contact?.customer_id || null, { shouldValidate: false }); // Set customerId to the contact's customerId
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      } else if (selectedCustomerId) { // If only customer is selected (no specific contact yet)
        // This is just a filter, do not pre-fill or set role based on customerId alone.
        form.setValue("customerContactId", null, { shouldValidate: false });
        // Reset name/email/role to default if no specific contact is selected
        form.setValue("firstName", initialData?.firstName || "", { shouldValidate: false });
        form.setValue("lastName", initialData?.lastName || "", { shouldValidate: false });
        form.setValue("email", initialData?.email || null, { shouldValidate: false });
        form.setValue("role", initialData?.role || "employee", { shouldValidate: false }); // Default role
      }
    }
  }, [selectedEmployeeId, selectedCustomerId, selectedCustomerContactId, isEditMode, form, employees, customers, customerContactsForUserAssignment, initialData]);


  const handleFormSubmit: SubmitHandler<UserFormInput> = async (data) => {
    const result = await onSubmit(data as UserFormValues);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    }
  };

  // Bestimmt, ob die Felder für Vorname, Nachname, E-Mail deaktiviert sein sollen
  const areNameEmailFieldsDisabled = isEditMode || !!selectedEmployeeId || !!selectedCustomerContactId;
  // Bestimmt, ob das Rollenfeld deaktiviert sein soll
  const isRoleFieldDisabled = isEditMode || !!selectedCustomerContactId; // Deaktiviert, wenn im Bearbeitungsmodus oder wenn Kundenkontakt ausgewählt (muss 'Kunde' sein)

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
      {!isEditMode && ( // Diese Felder nur im Erstellungsmodus anzeigen
        <div className="border-b pb-4 mb-4">
          <h3 className="text-md font-semibold mb-2">Bestehendem Profil zuweisen:</h3>
          <div>
            <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("employeeId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("customerId", null); // Wenn Mitarbeiter zugewiesen, Kunde entzuweisen
                  form.setValue("customerContactId", null); // Kundenkontakt entzuweisen
                }
              }}
              value={selectedEmployeeId || "unassigned"}
              disabled={loadingDropdowns || !!selectedCustomerId || !!selectedCustomerContactId} // Deaktivieren, wenn Kunde oder Kundenkontakt ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} disabled={!!emp.user_id}>
                    {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id ? '(Bereits zugewiesen)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
            )}
          </div>

          <div className="mt-4">
            <Label htmlFor="customerId">Kunden filtern (optional)</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("customerId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("employeeId", null); // Wenn Kunde zugewiesen, Mitarbeiter entzuweisen
                }
                form.setValue("customerContactId", null); // Kundenkontakt immer zurücksetzen, wenn Kunde wechselt
              }}
              value={selectedCustomerId || "unassigned"}
              disabled={loadingDropdowns || !!selectedEmployeeId || !!selectedCustomerContactId} // Deaktivieren, wenn Mitarbeiter oder Kundenkontakt ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kunden auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Kunde ausgewählt</SelectItem>
                {customers.map(cust => (
                  <SelectItem key={cust.id} value={cust.id}>
                    {cust.name} {cust.contact_email ? `(${cust.contact_email})` : ''} {cust.user_id ? '(Bereits zugewiesen)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
            )}
          </div>

          <div className="mt-4">
            <Label htmlFor="customerContactId">Kundenkontakt zuweisen (optional)</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("customerContactId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("employeeId", null); // Wenn Kundenkontakt zugewiesen, Mitarbeiter entzuweisen
                  // customerId bleibt bestehen, da es der Filter ist
                }
              }}
              value={selectedCustomerContactId || "unassigned"}
              disabled={loadingDropdowns || !!selectedEmployeeId || !selectedCustomerId || customerContactsForUserAssignment.length === 0} // Deaktivieren, wenn Mitarbeiter ausgewählt, kein Kunde ausgewählt oder keine Kontakte verfügbar
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kundenkontakt auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
                {customerContactsForUserAssignment.map(contact => (
                  <SelectItem key={contact.id} value={contact.id} disabled={!!contact.user_id}>
                    {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''} {contact.user_id ? '(Bereits zugewiesen)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerContactId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>
            )}
            {selectedCustomerId && customerContactsForUserAssignment.length === 0 && (
              <p className="text-muted-foreground text-sm mt-1">Keine Kontakte für diesen Kunden gefunden.</p>
            )}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Vorname"
          disabled={areNameEmailFieldsDisabled}
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">Nachname</Label>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Nachname"
          disabled={areNameEmailFieldsDisabled}
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="E-Mail-Adresse"
          disabled={areNameEmailFieldsDisabled}
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      {!isEditMode && (
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            {...form.register("password")}
            placeholder="Passwort"
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="role">Rolle</Label>
        <Select
          onValueChange={(value) => {
            form.setValue("role", value as UserFormValues["role"]);
            // Clear managerCustomerIds if role changes from manager
            if (value !== "manager") {
              form.setValue("managerCustomerIds", []);
            }
          }}
          value={selectedRole}
          disabled={isRoleFieldDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rolle auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Mitarbeiter</SelectItem>
            <SelectItem value="customer">Kunde</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.role.message}</p>
        )}
      </div>

      {isEditMode && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-md font-semibold mb-2">Profil-Zuweisungen bearbeiten:</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sie können die Zuweisung zu einem Mitarbeiter oder Kundenkontakt ändern oder aufheben.
          </p>

          {/* Bestehende Zuweisung anzeigen */}
          {(initialData?.employee || selectedEmployeeId) && !selectedCustomerContactId ? (
            <div className="p-4 border rounded-lg bg-muted/20 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">Aktuell zugewiesen an Mitarbeiter:</p>
                  <p className="text-sm text-muted-foreground">
                    {initialData?.employee
                      ? `${initialData.employee.first_name} ${initialData.employee.last_name}`
                      : employees.find(emp => emp.id === selectedEmployeeId)?.first_name + ' ' + employees.find(emp => emp.id === selectedEmployeeId)?.last_name
                    }
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue("employeeId", null);
                  }}
                >
                  Zuweisung aufheben
                </Button>
              </div>
            </div>
          ) : null}

          {selectedCustomerContactId && !selectedEmployeeId ? (
            <div className="p-4 border rounded-lg bg-muted/20 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">Aktuell zugewiesen an Kundenkontakt:</p>
                  <p className="text-sm text-muted-foreground">
                    {initialData?.customerContact
                      ? `${initialData.customerContact.first_name} ${initialData.customerContact.last_name}`
                      : customerContactsForUserAssignment.find(contact => contact.id === selectedCustomerContactId)?.first_name + ' ' + customerContactsForUserAssignment.find(contact => contact.id === selectedCustomerContactId)?.last_name
                    }
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue("customerContactId", null);
                    form.setValue("customerId", null);
                  }}
                >
                  Zuweisung aufheben
                </Button>
              </div>
            </div>
          ) : null}

          {/* Keine Zuweisung */}
          {!selectedEmployeeId && !selectedCustomerContactId ? (
            <div className="p-4 border rounded-lg bg-muted/20 mb-4">
              <p className="text-sm text-muted-foreground">Dieser Benutzer ist aktuell keinem Mitarbeiter oder Kundenkontakt zugewiesen.</p>
            </div>
          ) : null}

          {/* Bereich zum Ändern der Zuweisung */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
              <Select
                onValueChange={(value) => {
                  form.setValue("employeeId", value === "unassigned" ? null : value);
                  if (value !== "unassigned") {
                    form.setValue("customerId", null);
                    form.setValue("customerContactId", null);
                  }
                }}
                value={selectedEmployeeId || "unassigned"}
                disabled={loadingDropdowns}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} disabled={!!emp.user_id && emp.user_id !== (initialData as any)?.id}>
                      {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id && emp.user_id !== (initialData as any)?.id ? '(Bereits zugewiesen)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customerId">Kunde für Kundenkontakt (optional)</Label>
              <Select
                onValueChange={(value) => {
                  form.setValue("customerId", value === "unassigned" ? null : value);
                  if (value !== "unassigned") {
                    form.setValue("employeeId", null);
                  }
                  form.setValue("customerContactId", null);
                }}
                value={selectedCustomerId || "unassigned"}
                disabled={loadingDropdowns || !!selectedEmployeeId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kunden auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Kunde ausgewählt</SelectItem>
                  {customers.map(cust => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.name} {cust.contact_email ? `(${cust.contact_email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customerContactId">Kundenkontakt zuweisen (optional)</Label>
              <Select
                onValueChange={(value) => {
                  form.setValue("customerContactId", value === "unassigned" ? null : value);
                  if (value !== "unassigned") {
                    form.setValue("employeeId", null);
                  }
                }}
                value={selectedCustomerContactId || "unassigned"}
                disabled={loadingDropdowns || !!selectedEmployeeId || !selectedCustomerId || customerContactsForUserAssignment.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kundenkontakt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
                  {customerContactsForUserAssignment.map(contact => (
                    <SelectItem key={contact.id} value={contact.id} disabled={!!contact.user_id && contact.user_id !== (initialData as any)?.id}>
                      {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''} {contact.user_id && contact.user_id !== (initialData as any)?.id ? '(Bereits zugewiesen)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomerId && customerContactsForUserAssignment.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">Keine Kontakte für diesen Kunden gefunden.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedRole === "manager" && !isEditMode && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-md font-semibold mb-2">Kunden für Manager zuweisen:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
            {allCustomersForManager.length === 0 ? (
              <p className="col-span-full text-muted-foreground">Keine Kunden zum Zuweisen gefunden.</p>
            ) : (
              allCustomersForManager.map((customer) => (
                <div key={customer.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`manager-customer-${customer.id}`}
                    checked={form.watch("managerCustomerIds")?.includes(customer.id)}
                    onCheckedChange={(checked) => {
                      const currentCustomerIds = form.getValues("managerCustomerIds") || [];
                      if (checked) {
                        form.setValue("managerCustomerIds", [...currentCustomerIds, customer.id], { shouldValidate: false });
                      } else {
                        form.setValue("managerCustomerIds", currentCustomerIds.filter((id: string) => id !== customer.id), { shouldValidate: false });
                      }
                    }}
                  />
                  <Label htmlFor={`manager-customer-${customer.id}`}>{customer.name}</Label>
                </div>
              ))
            )}
          </div>
          {form.formState.errors.managerCustomerIds && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.managerCustomerIds.message}</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}