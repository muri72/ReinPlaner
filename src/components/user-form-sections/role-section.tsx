"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserFormValues } from "@/lib/utils/form-utils";

interface RoleSectionProps {
  form: any;
  selectedRole?: UserFormValues["role"];
  isRoleFieldDisabled: boolean;
}

export function RoleSection({ form, selectedRole, isRoleFieldDisabled }: RoleSectionProps) {
  return (
    <div>
      <Label htmlFor="role" className="after:content-['*'] after:ml-0.5 after:text-destructive">Rolle</Label>
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
  );
}
