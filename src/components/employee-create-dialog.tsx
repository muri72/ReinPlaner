"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { createEmployee } from "@/app/dashboard/employees/actions";
// Removed unused import: import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface EmployeeCreateDialogProps {
  onEmployeeCreated?: () => void;
}

export function EmployeeCreateDialog({ onEmployeeCreated }: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `employee-create-dialog-title`;
  const descriptionId = `employee-create-dialog-description`;

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
      <DialogContent 
        key={open ? "employee-create-open" : "employee-create-closed"} 
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neuen Mitarbeiter hinzufügen</DialogTitle>
          <DialogDescription id={descriptionId} className="sr-only">
            Formular zum Hinzufügen eines neuen Mitarbeiters.
          </DialogDescription>
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