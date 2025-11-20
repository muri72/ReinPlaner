"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { RecordDialog } from "@/components/ui/record-dialog";

interface CustomerContactCreateGeneralDialogProps {
  customerId?: string;
  onContactCreated?: (newContactId: string) => void;
}

export function CustomerContactCreateGeneralDialog({ customerId, onContactCreated }: CustomerContactCreateGeneralDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCreate = async (data: CustomerContactFormValues) => {
    const result = await createCustomerContact(data);
    if (result.success) {
      setOpen(false);
      if (result.newContactId) {
        onContactCreated?.(result.newContactId);
      }
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Neuen Kundenkontakt hinzufügen"
      description="Formular zum Hinzufügen eines neuen Kundenkontakts."
      icon={<Users className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Kundenkontakt hinzufügen
        </Button>
      </DialogTrigger>

      <CustomerContactForm
        initialData={customerId ? { customerId } : undefined}
        onSubmit={handleCreate}
        submitButtonText="Kundenkontakt hinzufügen"
        onSuccess={() => setOpen(false)}
        isInDialog={true}
      />
    </RecordDialog>
  );
}