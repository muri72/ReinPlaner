"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { updateAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
import { RecordDialog } from "@/components/ui/record-dialog";

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
  trigger?: React.ReactNode;
  onRequestUpdated?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestEditDialog({ request, trigger, onRequestUpdated, currentUserRole, currentUserId }: AbsenceRequestEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleUpdate = async (data: AbsenceRequestFormValues) => {
    const result = await updateAbsenceRequest(request.id, data);
    if (result.success) {
      setOpenState(false);
      onRequestUpdated?.();
    }
    return result;
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10">
      <Pencil className="h-4 w-4" />
    </Button>
  );

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Abwesenheitsantrag bearbeiten"
      description="Bearbeiten Sie den Abwesenheitsantrag."
      icon={<Calendar className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>

      <AbsenceRequestForm
        initialData={{
          employeeId: request.employee_id,
          startDate: new Date(request.start_date),
          endDate: new Date(request.end_date),
          type: request.type as AbsenceRequestFormValues["type"],
          status: request.status as AbsenceRequestFormValues["status"],
          notes: request.notes || undefined,
          adminNotes: request.admin_notes || undefined,
        }}
        onSubmit={handleUpdate}
        submitButtonText="Änderungen speichern"
        onSuccess={() => setInternalOpen(false)}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
