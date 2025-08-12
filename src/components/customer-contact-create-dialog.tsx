"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface CustomerContactCreateDialogProps {
  customerId: string;
  onContactCreated?: (newContactId: string) => void;
  disabled?: boolean;
}

export function CustomerContactCreateDialog({ customerId, onContactCreated, disabled }: CustomerContactCreateDialogProps) {
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mb-1"
          disabled={disabled}
          title={disabled ? "Bitte zuerst einen Kunden auswählen" : "Neuen Kundenkontakt für diesen Kunden erstellen"}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "customer-contact-create-open" : "customer-contact-create-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="customer-contact-create-dialog-title" aria-describedby="customer-contact-create-dialog-description">
        <DialogHeader>
          <DialogTitle id="customer-contact-create-dialog-title">Neuen Kundenkontakt erstellen</DialogTitle>
          <DialogDescription id="customer-contact-create-dialog-description">
            <VisuallyHidden>Formular zum Erstellen eines neuen Kundenkontakts.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <CustomerContactForm
          initialData={{ customerId: customerId }}
          onSubmit={handleCreate}
          submitButtonText="Kundenkontakt hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}