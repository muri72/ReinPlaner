"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { updateCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CustomerContactEditDialogProps {
  contact: {
    id: string;
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
  };
  onSuccess?: () => void;
}

export function CustomerContactEditDialog({ contact, onSuccess }: CustomerContactEditDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  const handleUpdate = async (data: CustomerContactFormValues) => {
    const result = await updateCustomerContact(contact.id, data);
    if (result.success) {
      setOpen(false);
      onSuccess?.(); // Triggere Neuladen der Daten
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kundenkontakt bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "customer-contact-edit-open" : "customer-contact-edit-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Kundenkontakt bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten des Kundenkontakts.
          </DialogDescription>
        </DialogHeader>
        <CustomerContactForm
          initialData={{
            customerId: contact.customer_id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}