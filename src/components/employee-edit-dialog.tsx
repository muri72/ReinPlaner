"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { updateEmployee } from "@/app/dashboard/employees/actions";

interface EmployeeEditDialogProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    hire_date: string | null;
    status: string;
    // Neue Felder
    contract_type: string | null;
    hourly_rate: number | null;
    start_date: string | null;
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
        </DialogHeader>
        <EmployeeForm
          initialData={{
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email,
            phone: employee.phone,
            hireDate: employee.hire_date ? new Date(employee.hire_date) : undefined,
            status: employee.status as EmployeeFormValues["status"],
            // Neue Felder übergeben
            contractType: employee.contract_type as EmployeeFormValues["contractType"],
            hourlyRate: employee.hourly_rate,
            startDate: employee.start_date ? new Date(employee.start_date) : undefined,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}