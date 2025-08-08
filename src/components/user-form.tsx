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

// Define the base schema first to avoid circular dependency
const baseUserSchema = z.object({
  email: z.union([
    z.string().email("Ungültiges E-Mail-Format"),
    z.literal(""), // Erlaube leeren String
  ]).transform(e => e === "" ? null : e).optional().nullable(),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein").optional(), // Optional for updates
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"), // Vorname wieder erforderlich gemacht
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"), // Nachname wieder erforderlich gemacht
  role: z.enum(["admin", "manager", "employee", "customer"]).default("employee"),
  // These are only for NEW user creation, not for editing existing users
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
  managerCustomerIds: z.array(z.string().uuid()).optional(), // For manager role
});

// Now define the types based on the base schema
export type UserFormInput = z.input<typeof baseUserSchema>;
export type UserFormValues = z.infer<typeof baseUserSchema>;

// Apply refine methods to the base schema
export const userSchema = baseUserSchema
.refine((data) => { // 'data' is now correctly inferred as UserFormValues
  // E-Mail ist erforderlich, wenn ein neues Benutzerkonto erstellt wird (Passwort ist vorhanden)
  // UND kein Mitarbeiter oder Kunde zugewiesen ist.
  if (!data.employeeId && !data.customerId && data.password !== undefined) {
    return data.email !== null && data.email !== ""; // E-Mail muss vorhanden und nicht leer sein
  }
  return true; // Andernfalls ist E-Mail optional/nullable
}, {
  message: "E-Mail ist erforderlich, wenn kein Mitarbeiter oder Kunde zugewiesen ist.",
  path: ["email"],
})
.refine((data) => { // 'data' is now correctly inferred as UserFormValues
  // Existing validation for role and assignment combinations
  if (data.password !== undefined) {
    if (data.employeeId && data.customerId) {
      return false;
    }
    if (data.employeeId && data.role !== 'employee') {
      return false;
    }
    if (data.customerId && data.role !== 'customer') {
      return false;
    }
    if (data.role === 'manager' && (data.employeeId || data.customerId)) {
      return false;
    }
    if (data.role !== 'manager' && data.managerCustomerIds && data.managerCustomerIds.length > 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Ungültige Rollen- und Zuweisungskombination.",
  path: ["role"],
});


interface UserFormProps {
  initialData?: Partial<UserFormInput>;
  onSubmit: (data: UserFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
}

export function UserForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false }: UserFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null; email: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; user_id: string | null; contact_email: string | null }[]>([]);
  const [allCustomersForManager, setAllCustomersForManager] = useState<{ id: string; name: string }[]>([]); // For manager assignment
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const resolvedDefaultValues: UserFormValues = {
    email: initialData?.email ?? null, // Set to null if undefined
    password: initialData?.password ?? (isEditMode ? undefined : ""),
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    role: initialData?.role ?? "employee",
    // These initialData values are only relevant for new user creation, not for editing
    employeeId: initialData?.employeeId ?? null,
    customerId: initialData?.customerId ?? null,
    managerCustomerIds: initialData?.managerCustomerIds ?? [],
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema as z.ZodSchema<UserFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onSubmit", // KORREKTUR HIER: Validierung auf onSubmit setzen
  });

  const selectedRole = form.watch("role");
  const selectedEmployeeId = form.watch("employeeId");
  const selectedCustomerId = form.watch("customerId");

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDropdowns(true);
      // Fetch unassigned employees for new user creation
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id, email') // 'email' hinzugefügt
        .is('user_id', null) // Only unassigned employees
        .order('last_name', { ascending: true });

      if (employeesError) {
        console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
        toast.error("Fehler beim Laden der Mitarbeiter.");
      }
      setEmployees(employeesData || []);

      // Fetch unassigned customers for new user creation
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, user_id, contact_email') // 'contact_email' hinzugefügt
        .is('user_id', null) // Only unassigned customers
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

  // Effect to handle changes in employee/customer selection for auto-populating fields
  useEffect(() => {
    if (!isEditMode) {
      if (selectedEmployeeId) {
        const employee = employees.find(emp => emp.id === selectedEmployeeId);
        form.setValue("firstName", employee?.first_name || "", { shouldValidate: true });
        form.setValue("lastName", employee?.last_name || "", { shouldValidate: true });
        form.setValue("email", employee?.email || null, { shouldValidate: true }); // Set to null if empty
        form.setValue("role", "employee", { shouldValidate: true });
        form.setValue("customerId", null, { shouldValidate: true });
        form.setValue("managerCustomerIds", [], { shouldValidate: true });
      } else if (selectedCustomerId) {
        const customer = customers.find(cust => cust.id === selectedCustomerId);
        form.setValue("firstName", customer?.name || "", { shouldValidate: true });
        form.setValue("lastName", "", { shouldValidate: true }); // Customers typically only have one name field
        form.setValue("email", customer?.contact_email || null, { shouldValidate: true }); // Set to null if empty
        form.setValue("role", "customer", { shouldValidate: true });
        form.setValue("employeeId", null, { shouldValidate: true });
        form.setValue("managerCustomerIds", [], { shouldValidate: true });
      } else {
        // If no employee or customer is selected, clear and enable fields
        if (!initialData?.firstName) form.setValue("firstName", "", { shouldValidate: true });
        if (!initialData?.lastName) form.setValue("lastName", "", { shouldValidate: true });
        if (!initialData?.email) form.setValue("email", null, { shouldValidate: true }); // Set to null if empty
        // Reset role to default if not explicitly set by initialData
        if (!initialData?.role) form.setValue("role", "employee", { shouldValidate: true });
      }
    }
  }, [selectedEmployeeId, selectedCustomerId, isEditMode, form, employees, customers, initialData]);


  const handleFormSubmit: SubmitHandler<UserFormValues> = async (data) => {
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

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
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
                }
              }}
              value={selectedEmployeeId || "unassigned"}
              disabled={loadingDropdowns || !!selectedCustomerId} // Deaktivieren, wenn Kunde ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
            )}
          </div>

          <div className="mt-4">
            <Label htmlFor="customerId">Kunden zuweisen (optional)</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("customerId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("employeeId", null); // Wenn Kunde zugewiesen, Mitarbeiter entzuweisen
                }
              }}
              value={selectedCustomerId || "unassigned"}
              disabled={loadingDropdowns || !!selectedEmployeeId} // Deaktivieren, wenn Mitarbeiter ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kunden auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
                {customers.map(cust => (
                  <SelectItem key={cust.id} value={cust.id}>
                    {cust.name} {cust.contact_email ? `(${cust.contact_email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
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
          disabled={isEditMode || !!selectedEmployeeId || !!selectedCustomerId}
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
          disabled={isEditMode || !!selectedEmployeeId || !!selectedCustomerId}
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
          disabled={isEditMode || !!selectedEmployeeId || !!selectedCustomerId}
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
          disabled={isEditMode || !!selectedEmployeeId || !!selectedCustomerId} // Disable if employee/customer is selected
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
                        form.setValue("managerCustomerIds", [...currentCustomerIds, customer.id], { shouldValidate: true });
                      } else {
                        form.setValue("managerCustomerIds", currentCustomerIds.filter((id: string) => id !== customer.id), { shouldValidate: true });
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