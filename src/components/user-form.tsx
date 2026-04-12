"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";
import { handleActionResponse } from "@/lib/toast-utils";
import { FormActions } from "@/components/ui/form-actions";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { userSchema, UserFormInput, UserFormValues } from "@/lib/utils/form-utils";
import { useUserFormData, useUserAssignmentDialogs } from "@/hooks/use-user-form-data";
import { ReassignmentDialog, UnassignDialog } from "@/components/user-form-sections/user-assignment-dialogs";

// Import extracted sections
import {
  UserFormHeader,
  AssignmentSection,
  BasicInfoSection,
  CredentialsSection,
  RoleSection,
  ManagerSection,
  EditAssignmentsSection,
} from "./user-form-sections";

// Re-export types for backward compatibility
export type { UserFormInput, UserFormValues } from "@/lib/utils/form-utils";
export { userSchema } from "@/lib/utils/form-utils";

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

export function UserForm({ 
  initialData, 
  onSubmit, 
  submitButtonText, 
  onSuccess, 
  isEditMode = false, 
  employee, 
  customerContact, 
  isInDialog = false 
}: UserFormProps) {
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
        form.setValue("role", initialData?.role || "employee", { shouldValidate: false });
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      }

      if (selectedEmployeeId) {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        form.setValue("firstName", emp?.first_name || "", { shouldValidate: false });
        form.setValue("lastName", emp?.last_name || "", { shouldValidate: false });
        form.setValue("email", emp?.email || null, { shouldValidate: false });
        form.setValue("customerId", null, { shouldValidate: false });
        form.setValue("customerContactId", null, { shouldValidate: false });
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      } else if (selectedCustomerContactId) {
        const contact = customerContactsForUserAssignment.find(c => c.id === selectedCustomerContactId);
        form.setValue("firstName", contact?.first_name || "", { shouldValidate: false });
        form.setValue("lastName", contact?.last_name || "", { shouldValidate: false });
        form.setValue("email", contact?.email || null, { shouldValidate: false });
        form.setValue("role", "customer", { shouldValidate: false });
        form.setValue("employeeId", null, { shouldValidate: false });
        form.setValue("customerId", contact?.customer_id || null, { shouldValidate: false });
        form.setValue("managerCustomerIds", [], { shouldValidate: false });
      } else if (selectedCustomerId) {
        form.setValue("customerContactId", null, { shouldValidate: false });
        form.setValue("firstName", initialData?.firstName || "", { shouldValidate: false });
        form.setValue("lastName", initialData?.lastName || "", { shouldValidate: false });
        form.setValue("email", initialData?.email || null, { shouldValidate: false });
        form.setValue("role", initialData?.role || "employee", { shouldValidate: false });
      }
    }
  }, [selectedEmployeeId, selectedCustomerId, selectedCustomerContactId, isEditMode, form, employees, customerContactsForUserAssignment, initialData]);

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

  // Wrapper function to call handleFormSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const handleFormSubmit: SubmitHandler<UserFormInput> = async (data) => {
    const result = await onSubmit(data as UserFormValues);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      onSuccess?.();
    } else {
      onSuccess?.();
    }
  };

  // Handlers for assignment changes
  const handleEmployeeChange = (value: string) => {
    if (value === "unassigned") {
      handleUnassignConfirm('employee', 'Mitarbeiter-Zuweisung', 'Mitarbeiter-Zuweisung');
    } else {
      const emp = employees.find(e => e.id === value);
      if (emp?.user_id && emp.user_id !== (initialData as any)?.id) {
        handleReassignmentConfirm('employee', value, `${emp.first_name} ${emp.last_name}`);
      } else {
        form.setValue("employeeId", value);
      }
    }
    form.setValue("customerId", null);
    form.setValue("customerContactId", null);
  };

  const handleCustomerChange = (value: string) => {
    form.setValue("customerId", value === "unassigned" ? null : value);
    if (value !== "unassigned") {
      form.setValue("employeeId", null);
    }
    form.setValue("customerContactId", null);
  };

  const handleCustomerContactChange = (value: string) => {
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
  };

  // Field disabled states
  const areNameEmailFieldsDisabled = isEditMode || !!selectedEmployeeId || !!selectedCustomerContactId;
  const isRoleFieldDisabled = isEditMode || !!selectedCustomerContactId;

  return (
    <>
      {/* Dialogs for reassignment confirmation */}
      <ReassignmentDialog
        open={showReassignmentDialog}
        onOpenChange={setShowReassignmentDialog}
        onConfirm={() => {
          if (pendingReassignment) {
            form.setValue(
              pendingReassignment.type === 'employee' ? 'employeeId' : 'customerContactId',
              pendingReassignment.id
            );
            setShowReassignmentDialog(false);
            toast.success(`Zuweisung wird geändert: ${pendingReassignment.name} wird diesem Benutzer zugewiesen.`);
          }
        }}
        pendingReassignment={pendingReassignment}
      />
      <UnassignDialog
        open={showUnassignDialog}
        onOpenChange={setShowUnassignDialog}
        onConfirm={() => {
          if (pendingUnassign) {
            const fieldName = pendingUnassign.type === 'employee' ? 'employeeId' :
                             pendingUnassign.type === 'customerContact' ? 'customerContactId' :
                             'customerId';
            form.setValue(fieldName as any, null);
            setShowUnassignDialog(false);
            toast.success(`Zuweisung aufgehoben: ${pendingUnassign.name} ist jetzt ohne Benutzer-Zuweisung.`);
          }
        }}
        pendingUnassign={pendingUnassign}
      />

      <UserFormHeader isEditMode={isEditMode} isInDialog={isInDialog} />

      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 w-full">
        {/* Assignment Section - only in create mode */}
        {!isEditMode && (
          <AssignmentSection
            employees={employees}
            customers={customers}
            customerContactsForUserAssignment={customerContactsForUserAssignment}
            loadingDropdowns={loadingDropdowns}
            selectedEmployeeId={selectedEmployeeId}
            selectedCustomerId={selectedCustomerId}
            selectedCustomerContactId={selectedCustomerContactId}
            onEmployeeChange={handleEmployeeChange}
            onCustomerChange={handleCustomerChange}
            onCustomerContactChange={handleCustomerContactChange}
            onReassignmentConfirm={handleReassignmentConfirm}
            onUnassignConfirm={handleUnassignConfirm}
          />
        )}

        {/* Basic Info */}
        <BasicInfoSection form={form} areFieldsDisabled={areNameEmailFieldsDisabled} />

        {/* Password - only in create mode */}
        {!isEditMode && <CredentialsSection form={form} />}

        {/* Role */}
        <RoleSection form={form} selectedRole={selectedRole} isRoleFieldDisabled={isRoleFieldDisabled} />

        {/* Manager Customer Selection */}
        <ManagerSection
          form={form}
          allCustomersForManager={allCustomersForManager}
          selectedRole={selectedRole}
        />

        {/* Edit Mode Assignments */}
        {isEditMode && (
          <EditAssignmentsSection
            form={form}
            employees={employees}
            customers={customers}
            customerContactsForUserAssignment={customerContactsForUserAssignment}
            loadingDropdowns={loadingDropdowns}
            selectedEmployeeId={selectedEmployeeId}
            selectedCustomerId={selectedCustomerId}
            selectedCustomerContactId={selectedCustomerContactId}
            initialData={initialData}
            onEmployeeChange={handleEmployeeChange}
            onCustomerChange={handleCustomerChange}
            onCustomerContactChange={handleCustomerContactChange}
          />
        )}

        {/* Form Actions */}
        <FormActions
          onCancel={handleCancel}
          onSubmit={handleSubmitClick}
          isSubmitting={form.formState.isSubmitting}
          submitLabel={submitButtonText}
        />
      </form>
    </>
  );
}
