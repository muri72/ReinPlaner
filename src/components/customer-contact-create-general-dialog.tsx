"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CustomerContactCreateGeneralDialogProps {
  onContactCreated?: (newContactId: string) => void;
}

export function CustomerContactCreateGeneralDialog({ onContactCreated }: CustomerContactCreateGeneralDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

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
      <DialogContent 
        key={open ? "customer-contact-create-general-open" : "customer-contact-create-general-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Neuen Kundenkontakt hinzufügen</DialogTitle>
          <DialogDescription>
            Formular zum Hinzufügen eines neuen Kundenkontakts.
          </DialogDescription>
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