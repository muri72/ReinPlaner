"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { createAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
import { RecordDialog } from "@/components/ui/record-dialog";

interface AbsenceRequestCreateDialogProps {
  onAbsenceRequestCreated?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestCreateDialog({ onAbsenceRequestCreated, currentUserRole, currentUserId }: AbsenceRequestCreateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCreate = async (data: AbsenceRequestFormValues) => {
    const result = await createAbsenceRequest(data);
    if (result.success) {
      setOpen(false);
      onAbsenceRequestCreated?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Neuen Antrag einreichen"
      description="Reichen Sie einen neuen Abwesenheitsantrag ein."
      icon={<Calendar className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Antrag einreichen
        </Button>
      </DialogTrigger>

      <AbsenceRequestForm
        onSubmit={handleCreate}
        submitButtonText="Antrag einreichen"
        onSuccess={() => setOpen(false)}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
