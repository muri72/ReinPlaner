"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { createAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Antrag einreichen
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "absence-request-create-open" : "absence-request-create-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="absence-request-create-dialog-title" aria-describedby="absence-request-create-dialog-description">
        <DialogHeader>
          <DialogTitle id="absence-request-create-dialog-title">Neuen Abwesenheitsantrag einreichen</DialogTitle>
          <DialogDescription id="absence-request-create-dialog-description">
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