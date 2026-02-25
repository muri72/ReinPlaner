"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { handleActionResponse } from "@/lib/toast-utils";
import { FormActions } from "@/components/ui/form-actions";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { userSchema, UserFormInput, UserFormValues } from "@/lib/utils/form-utils";
import { useUserFormData, useUserAssignmentDialogs } from "@/hooks/use-user-form-data";
import { ReassignmentDialog, UnassignDialog } from "@/components/user-form/user-assignment-dialogs";
import { Eye, EyeOff } from "lucide-react";

// Re-export types for backward compatibility
export type { UserFormInput, UserFormValues } from "@/lib/utils/form-utils";
export { userSchema } from "@/lib/utils/form-utils";

// Helper component for labels with required asterisk
function LabelWithRequired({ htmlFor, children, required, className }: { htmlFor: string; children: React.ReactNode; required?: boolean; className?: string }) {
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

interface UserFormProps {
  initialData?: Partial<UserFormInput> & {
    employee?: { id: string; first_name: string; last_name: string } | null;
    customerContact?: { id: string; first_name: string; last_name: string; customer_id: string } | null;
  };
  onSubmit: (data: UserFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
  employee?: { id: string; first_name: string; last_name: string } | null;
  customerContact?: { id: string; first_name: string; last_name: string; customer_id: string } | null;
  isInDialog?: boolean;
}

export function UserForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false, employee, customerContact, isInDialog = false }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Use extracted hooks for data fetching and dialogs
  const {
    employees,
    customers,
    customerContactsForUserAssignment,
    allCustomersForManager,
    loadingDropdowns,
    fetchCustomerContacts,
  } = useUserFormData();

  const {
    showReassignmentDialog,
    setShowReassignmentDialog,
    pendingReassignment,
    handleReassignmentConfirm,
    showUnassignDialog,
    setShowUnassignDialog,
    pendingUnassign,
    handleUnassignConfirm,
  } = useUserAssignmentDialogs();

  const resolvedDefaultValues: UserFormValues = {
    email: initialData?.email ?? null,
    password: initialData?.password ?? (isEditMode ? undefined : ""),
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    role: initialData?.role ?? "employee",
    employeeId: initialData?.employeeId ?? employee?.id ?? null,
    customerId: initialData?.customerId ?? customerContact?.customer_id ?? null,
    customerContactId: initialData?.customerContactId ?? customerContact?.id ?? null,
    managerCustomerIds: initialData?.managerCustomerIds ?? [],
  };

  const form = useForm<UserFormInput>({
    resolver: zodResolver(userSchema),
    defaultValues: resolvedDefaultValues,
    mode: "onSubmit",
  });

  // Register with unsaved changes context
  useFormUnsavedChanges("user-form", form.formState.isDirty);

  const selectedRole = form.watch("role");
  const selectedEmployeeId = form.watch("employeeId");
  const selectedCustomerId = form.watch("customerId");
  const selectedCustomerContactId = form.watch("customerContactId");

  // Effect to fetch customer contacts when a customer is selected
  useEffect(() => {
    fetchCustomerContacts(selectedCustomerId || null);
    if (!selectedCustomerId) {
      form.setValue("customerContactId", null, { shouldValidate: false });
    }
  }, [selectedCustomerId, fetchCustomerContacts, form]);


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

  // Update form values when employee or customerContact props change (for edit mode)
  useEffect(() => {
    if (isEditMode && employee) {
      form.setValue("employeeId", employee.id, { shouldValidate: false });
    }
  }, [employee, isEditMode, form]);

  useEffect(() => {
    if (isEditMode && customerContact) {
      form.setValue("customerContactId", customerContact.id, { shouldValidate: false });
      form.setValue("customerId", customerContact.customer_id, { shouldValidate: false });
    }
  }, [customerContact, isEditMode, form]);

  // Confirm reassignment handler
  const confirmReassignment = () => {
    if (pendingReassignment) {
      form.setValue(pendingReassignment.type === 'employee' ? 'employeeId' : 'customerContactId', pendingReassignment.id);
      setShowReassignmentDialog(false);
      toast.success(`Zuweisung wird geändert: ${pendingReassignment.name} wird diesem Benutzer zugewiesen.`);
    }
  };

  // Confirm unassign handler
  const confirmUnassign = () => {
    if (pendingUnassign) {
      const fieldName = pendingUnassign.type === 'employee' ? 'employeeId' :
                       pendingUnassign.type === 'customerContact' ? 'customerContactId' :
                       'customerId';
      form.setValue(fieldName as any, null);
      setShowUnassignDialog(false);
      toast.success(`Zuweisung aufgehoben: ${pendingUnassign.name} ist jetzt ohne Benutzer-Zuweisung.`);
    }
  };

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

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      // Show confirmation - dialog protection will handle this
      onSuccess?.();
    } else {
      onSuccess?.();
    }
  };

  // Wrapper function to call handleFormSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  // Bestimmt, ob die Felder für Vorname, Nachname, E-Mail deaktiviert sein sollen
  const areNameEmailFieldsDisabled = isEditMode || !!selectedEmployeeId || !!selectedCustomerContactId;
  // Bestimmt, ob das Rollenfeld deaktiviert sein soll
  const isRoleFieldDisabled = isEditMode || !!selectedCustomerContactId; // Deaktiviert, wenn im Bearbeitungsmodus oder wenn Kundenkontakt ausgewählt (muss 'Kunde' sein)

  return (
    <>
      {!isInDialog && (
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Benutzer {isEditMode ? "bearbeiten" : "erstellen"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? "Bearbeiten Sie die Benutzerinformationen." : "Erstellen Sie einen neuen Benutzer."}
          </p>
        </div>
      )}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 w-full">
      {!isEditMode && ( // Diese Felder nur im Erstellungsmodus anzeigen
        <div className="border-b pb-4 mb-4">
          <h3 className="text-md font-semibold mb-2">Bestehendem Profil zuweisen:</h3>
          <p className="text-sm text-muted-foreground mb-3">
            💡 <strong>Tipp:</strong> Sie können jetzt auch <strong>System-User</strong> ohne Mitarbeiter-Zuweisung erstellen (z.B. für Admins).
            Bereits zugewiesene Mitarbeiter können neu zugewiesen werden - der alte Benutzer wird automatisch entkoppelt.
          </p>
          <div>
            <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
            <Select
              onValueChange={(value) => {
                if (value === "unassigned") {
                  handleUnassignConfirm('employee', 'Mitarbeiter-Zuweisung', 'Mitarbeiter-Zuweisung');
                } else {
                  // Prüfe, ob bereits zugewiesen
                  const employee = employees.find(emp => emp.id === value);
                  if (employee?.user_id && employee.user_id !== (initialData as any)?.id) {
                    handleReassignmentConfirm('employee', value, `${employee.first_name} ${employee.last_name}`);
                  } else {
                    form.setValue("employeeId", value);
                  }
                }
                form.setValue("customerId", null);
                form.setValue("customerContactId", null);
              }}
              value={selectedEmployeeId || "unassigned"}
              disabled={loadingDropdowns || !!selectedCustomerId || !!selectedCustomerContactId} // Deaktivieren, wenn Kunde oder Kundenkontakt ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen (System-User)</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
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
                if (value === "unassigned") {
                  handleUnassignConfirm('customerContact', 'Kundenkontakt-Zuweisung', 'Kundenkontakt-Zuweisung');
                } else {
                  // Prüfe, ob bereits zugewiesen
                  const contact = customerContactsForUserAssignment.find(c => c.id === value);
                  if (contact?.user_id && contact.user_id !== (initialData as any)?.id) {
                    handleReassignmentConfirm('customerContact', value, `${contact.first_name} ${contact.last_name}`);
                  } else {
                    form.setValue("customerContactId", value);
                  }
                }
                form.setValue("employeeId", null);
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
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''} {contact.user_id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
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
        <LabelWithRequired htmlFor="firstName" required>Vorname</LabelWithRequired>
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
        <LabelWithRequired htmlFor="lastName" required>Nachname</LabelWithRequired>
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
        <LabelWithRequired htmlFor="email" required>E-Mail</LabelWithRequired>
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
          <LabelWithRequired htmlFor="password" required>Passwort</LabelWithRequired>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
              placeholder="Passwort"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
      )}
      <div>
        <LabelWithRequired htmlFor="role" required>Rolle</LabelWithRequired>
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
                  if (value === "unassigned") {
                    handleUnassignConfirm('employee', 'Mitarbeiter-Zuweisung', 'Mitarbeiter-Zuweisung');
                  } else {
                    const employee = employees.find(emp => emp.id === value);
                    if (employee?.user_id && employee.user_id !== (initialData as any)?.id) {
                      handleReassignmentConfirm('employee', value, `${employee.first_name} ${employee.last_name}`);
                    } else {
                      form.setValue("employeeId", value);
                    }
                  }
                  form.setValue("customerId", null);
                  form.setValue("customerContactId", null);
                }}
                value={selectedEmployeeId || "unassigned"}
                disabled={loadingDropdowns}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen (System-User)</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id && emp.user_id !== (initialData as any)?.id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
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
                  if (value === "unassigned") {
                    handleUnassignConfirm('customerContact', 'Kundenkontakt-Zuweisung', 'Kundenkontakt-Zuweisung');
                  } else {
                    const contact = customerContactsForUserAssignment.find(c => c.id === value);
                    if (contact?.user_id && contact.user_id !== (initialData as any)?.id) {
                      handleReassignmentConfirm('customerContact', value, `${contact.first_name} ${contact.last_name}`);
                    } else {
                      form.setValue("customerContactId", value);
                    }
                  }
                  form.setValue("employeeId", null);
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
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''} {contact.user_id && contact.user_id !== (initialData as any)?.id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
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

      {/* Confirmation Dialogs */}
      <ReassignmentDialog
        open={showReassignmentDialog}
        onOpenChange={setShowReassignmentDialog}
        pendingReassignment={pendingReassignment}
        onConfirm={confirmReassignment}
      />
      <UnassignDialog
        open={showUnassignDialog}
        onOpenChange={setShowUnassignDialog}
        pendingUnassign={pendingUnassign}
        onConfirm={confirmUnassign}
      />
    </>
  );
}