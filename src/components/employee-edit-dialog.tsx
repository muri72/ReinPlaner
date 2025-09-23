"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { updateEmployee } from "@/app/dashboard/employees/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmployeeEditDialogProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    hire_date: string | null;
    status: "active" | "inactive" | "on_leave";
    contract_type: "full_time" | "part_time" | "minijob" | "freelancer" | null;
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
    contract_end_date: string | null;
    default_daily_schedules: any[];
    default_recurrence_interval_weeks: number;
    default_start_week_offset: number;
  };
  children?: React.ReactNode;
  onEmployeeUpdated?: () => void;
}

export function EmployeeEditDialog({ employee, children, onEmployeeUpdated }: EmployeeEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: EmployeeFormValues) => {
    const result = await updateEmployee(employee.id, data);
    
    if (result.success) {
      setOpen(false);
      onEmployeeUpdated?.();
    }
    
    return result;
  };

  const trigger = children ? (
    <DialogTrigger asChild>{children}</DialogTrigger>
  ) : (
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
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4">
          <EmployeeForm
            initialData={employee as any}
            onSubmit={handleUpdate}
            submitButtonText="Änderungen speichern"
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}