"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AbsenceRequestForm, AbsenceRequestFormValues } from "@/components/absence-request-form";
import { createAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
// Removed import: VisuallyHidden

interface AbsenceRequestCreateDialogProps {
  onAbsenceRequestCreated?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestCreateDialog({ onAbsenceRequestCreated, currentUserRole, currentUserId }: AbsenceRequestCreateDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

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
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
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