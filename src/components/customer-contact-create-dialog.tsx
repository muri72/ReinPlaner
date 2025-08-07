"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { createCustomerContact } from "@/app/dashboard/customer-contacts/actions";

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
      // Annahme: Die createCustomerContact-Aktion gibt die ID des neuen Kontakts zurück
      // Da die aktuelle Aktion dies nicht tut, müssen wir die Liste neu laden
      // oder eine andere Methode finden, um die ID zu erhalten.
      // Fürs Erste rufen wir onContactCreated ohne spezifische ID auf,
      // was die übergeordnete Komponente dazu veranlassen sollte, ihre Liste neu zu laden.
      onContactCreated?.("refresh"); // Signalisiert, dass die Liste aktualisiert werden muss
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
      <DialogContent className="sm:max-w-[425px]">
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