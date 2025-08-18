"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TimeEntryForm, TimeEntryFormValues } from "@/components/time-entry-form";
import { createTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface TimeEntryCreateDialogProps {
  initialData?: Partial<TimeEntryFormValues>;
  triggerButtonText?: string;
  triggerButtonIcon?: React.ReactNode;
  triggerButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerButtonClassName?: string;
  dialogTitle?: string;
  onEntryCreated?: (newEntryId: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function TimeEntryCreateDialog({
  initialData,
  triggerButtonText = "Neuen Zeiteintrag hinzufügen",
  triggerButtonIcon,
  triggerButtonVariant = "default",
  triggerButtonClassName,
  dialogTitle = "Neuen Zeiteintrag erstellen",
  onEntryCreated,
  currentUserId,
  isAdmin,
}: TimeEntryCreateDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  const handleCreate = async (data: TimeEntryFormValues) => {
    const result = await createTimeEntry(data);
    if (result.success) {
      setOpen(false);
      if (result.newEntryId) {
        onEntryCreated?.(result.newEntryId);
      }
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
          {triggerButtonIcon}
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "time-entry-create-open" : "time-entry-create-closed"} 
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Formular zum Erstellen eines neuen Zeiteintrags.
          </DialogDescription>
        </DialogHeader>
        <TimeEntryForm
          initialData={initialData}
          onSubmit={handleCreate}
          submitButtonText="Zeiteintrag hinzufügen"
          onSuccess={() => setOpen(false)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
}