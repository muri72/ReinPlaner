"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";

interface CustomerContactCreateGeneralDialogProps {
  onContactCreated?: (newContactId: string) => void;
}

export function CustomerContactCreateGeneralDialog({ onContactCreated }: CustomerContactCreateGeneralDialogProps) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Kundenkontakt hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "customer-contact-create-general-open" : "customer-contact-create-general-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="customer-contact-create-general-dialog-title">
        <DialogHeader>
          <DialogTitle id="customer-contact-create-general-dialog-title">Neuen Kundenkontakt hinzufügen</DialogTitle>
        </DialogHeader>
        <CustomerContactForm
          onSubmit={handleCreate}
          submitButtonText="Kundenkontakt hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}