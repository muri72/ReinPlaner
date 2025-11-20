"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock } from "lucide-react";
import { TimeEntryForm, TimeEntryFormValues } from "@/components/time-entry-form";
import { createTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { RecordDialog } from "@/components/ui/record-dialog";

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
      onEntryCreated?.(result.newEntryId || "");
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title={dialogTitle}
      icon={<Clock className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
          {triggerButtonIcon || <PlusCircle className="mr-2 h-4 w-4" />}
          {triggerButtonText}
        </Button>
      </DialogTrigger>

      <TimeEntryForm
        initialData={initialData}
        onSubmit={handleCreate}
        submitButtonText="Zeiteintrag erstellen"
        onSuccess={() => setOpen(false)}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
