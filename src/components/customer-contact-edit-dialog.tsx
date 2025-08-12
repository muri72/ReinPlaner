"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { updateCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
}

export function CustomerContactEditDialog({ contact }: CustomerContactEditDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `customer-contact-edit-dialog-title`;
  const descriptionId = `customer-contact-edit-dialog-description`;

  const handleUpdate = async (data: CustomerContactFormValues) => {
    const result = await updateCustomerContact(contact.id, data);
    if (result.success) {
      setOpen(false);
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
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Kundenkontakt bearbeiten</DialogTitle>
          <DialogDescription id={descriptionId}>
            <VisuallyHidden>Formular zum Bearbeiten des Kundenkontakts.</VisuallyHidden>
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