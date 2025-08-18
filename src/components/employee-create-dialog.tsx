"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { createEmployee } from "@/app/dashboard/employees/actions";

interface EmployeeCreateDialogProps {
  onEmployeeCreated?: () => void;
}

export function EmployeeCreateDialog({ onEmployeeCreated }: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCreate = async (data: EmployeeFormValues) => {
    const result = await createEmployee(data);
    if (result.success) {
      setOpen(false);
      onEmployeeCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Mitarbeiter hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "employee-create-open" : "employee-create-closed"} className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card" aria-labelledby="employee-create-dialog-title">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter hinzufügen</DialogTitle>
        </DialogHeader>
        <EmployeeForm
          onSubmit={handleCreate}
          submitButtonText="Mitarbeiter hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}