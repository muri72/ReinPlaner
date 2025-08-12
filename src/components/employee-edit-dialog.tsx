"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { updateEmployee } from "@/app/dashboard/employees/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface EmployeeEditDialogProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    hire_date: string | null;
    status: string;
    contract_type: string | null;
    hourly_rate: number | null;
    start_date: string | null;
    job_title: string | null;
    department: string | null;
    notes: string | null;
    address: string | null;
    date_of_birth: string | null;
    social_security_number: string | null;
    tax_id_number: string | null;
    health_insurance_provider: string | null;
  };
}

export function EmployeeEditDialog({ employee }: EmployeeEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: EmployeeFormValues) => {
    const result = await updateEmployee(employee.id, data);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mitarbeiter bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent key={open ? "employee-edit-open" : "employee-edit-closed"} aria-labelledby="employee-edit-dialog-title" aria-describedby="employee-edit-dialog-description">
        <DialogHeader>
          <DialogTitle id="employee-edit-dialog-title">Mitarbeiter bearbeiten</DialogTitle>
          <DialogDescription id="employee-edit-dialog-description">
            <VisuallyHidden>Formular zum Bearbeiten der Mitarbeiterdaten.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          initialData={{
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email,
            phone: employee.phone,
            hireDate: employee.hire_date ? new Date(employee.hire_date) : undefined,
            status: employee.status as EmployeeFormValues["status"],
            contractType: employee.contract_type as EmployeeFormValues["contractType"],
            hourlyRate: employee.hourly_rate,
            startDate: employee.start_date ? new Date(employee.start_date) : undefined,
            jobTitle: employee.job_title,
            department: employee.department,
            notes: employee.notes,
            address: employee.address,
            dateOfBirth: employee.date_of_birth ? new Date(employee.date_of_birth) : undefined,
            socialSecurityNumber: employee.social_security_number,
            taxIdNumber: employee.tax_id_number,
            healthInsuranceProvider: employee.health_insurance_provider,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}