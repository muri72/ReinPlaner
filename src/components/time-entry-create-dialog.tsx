"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TimeEntryForm, TimeEntryFormValues } from "@/components/time-entry-form";
import { createTimeEntry } from "@/app/dashboard/time-tracking/actions";

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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
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