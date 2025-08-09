"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";

interface CustomerContactCreateDialogProps {
  customerId: string;
  onContactCreated?: (newContactId: string) => void; // Typ geändert, um die ID zu erwarten
  disabled?: boolean;
}

export function CustomerContactCreateDialog({ customerId, onContactCreated, disabled }: CustomerContactCreateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCreate = async (data: CustomerContactFormValues) => {
    const result = await createCustomerContact(data);
    if (result.success) {
      setOpen(false);
      if (result.newContactId) {
        onContactCreated?.(result.newContactId); // Die tatsächliche ID weitergeben
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Kundenkontakt erstellen</DialogTitle>
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