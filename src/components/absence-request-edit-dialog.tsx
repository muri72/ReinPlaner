"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { updateAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

interface AbsenceRequestEditDialogProps {
  request: {
    id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    type: string;
    status: string;
    notes: string | null;
    admin_notes: string | null;
  };
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestEditDialog({ request, currentUserRole, currentUserId }: AbsenceRequestEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: AbsenceRequestFormValues) => {
    const result = await updateAbsenceRequest(request.id, data);
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
            <p>Antrag bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abwesenheitsantrag bearbeiten</DialogTitle>
        </DialogHeader>
        <AbsenceRequestForm
          initialData={{
            employeeId: request.employee_id,
            startDate: new Date(request.start_date),
            endDate: new Date(request.end_date),
            type: request.type as AbsenceRequestFormValues["type"],
            status: request.status as AbsenceRequestFormValues["status"],
            notes: request.notes,
            adminNotes: request.admin_notes,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      </DialogContent>
    </Dialog>
  );
}