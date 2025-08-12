"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { createAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface AbsenceRequestCreateDialogProps {
  onAbsenceRequestCreated?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestCreateDialog({ onAbsenceRequestCreated, currentUserRole, currentUserId }: AbsenceRequestCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `absence-request-create-dialog-title`;
  const descriptionId = `absence-request-create-dialog-description`;

  const handleCreate = async (data: AbsenceRequestFormValues) => {
    const result = await createAbsenceRequest(data);
    if (result.success) {
      setOpen(false);
      onAbsenceRequestCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Antrag einreichen
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "absence-request-create-open" : "absence-request-create-closed"} 
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neuen Abwesenheitsantrag einreichen</DialogTitle>
          <DialogDescription id={descriptionId}>
            <VisuallyHidden>Formular zum Einreichen eines neuen Abwesenheitsantrags.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <AbsenceRequestForm
          onSubmit={handleCreate}
          submitButtonText="Antrag einreichen"
          onSuccess={() => setOpen(false)}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      </DialogContent>
    </Dialog>
  );
}