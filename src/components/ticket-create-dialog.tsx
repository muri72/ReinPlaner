"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { TicketForm, TicketFormValues, TicketFormInput } from "@/components/ticket-form"; // Import TicketFormInput
import { createTicket } from "@/app/dashboard/tickets/actions";

interface TicketCreateDialogProps {
  onTicketCreated?: () => void;
  triggerButtonText?: string;
  triggerButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerButtonClassName?: string;
  initialData?: Partial<TicketFormInput>; // Added initialData prop
}

export function TicketCreateDialog({
  onTicketCreated,
  triggerButtonText = "Neues Ticket erstellen",
  triggerButtonVariant = "default",
  triggerButtonClassName,
  initialData, // Destructure initialData
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "ticket-create-open" : "ticket-create-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Neues Ticket erstellen</DialogTitle>
          <DialogDescription>
            Füllen Sie das Formular aus, um ein neues Support-Ticket zu erstellen.
          </DialogDescription>
        </DialogHeader>
        <TicketForm
          initialData={initialData} // Pass initialData to TicketForm
          onSubmit={handleCreate}
          submitButtonText="Ticket erstellen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}