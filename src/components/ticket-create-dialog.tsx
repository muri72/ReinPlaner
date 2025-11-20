"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { TicketForm, TicketFormValues, TicketFormInput } from "@/components/ticket-form";
import { createTicket } from "@/app/dashboard/tickets/actions";
import { RecordDialog } from "@/components/ui/record-dialog";

interface TicketCreateDialogProps {
  onTicketCreated?: () => void;
  triggerButtonText?: string;
  triggerButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerButtonClassName?: string;
  initialData?: Partial<TicketFormInput>;
}

export function TicketCreateDialog({
  onTicketCreated,
  triggerButtonText = "Neues Ticket erstellen",
  triggerButtonVariant = "default",
  triggerButtonClassName,
  initialData,
}: TicketCreateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCreate = async (data: TicketFormValues) => {
    const result = await createTicket(data);
    if (result.success) {
      setOpen(false);
      onTicketCreated?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Neues Ticket erstellen"
      description="Erstellen Sie ein neues Support-Ticket für Ihr Anliegen."
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {triggerButtonText}
        </Button>
      </DialogTrigger>

      <TicketForm
        initialData={initialData}
        onSubmit={handleCreate}
        submitButtonText="Ticket erstellen"
        onSuccess={() => setOpen(false)}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
