"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Users } from "lucide-react";
import { CustomerContactForm, CustomerContactFormValues } from "@/components/customer-contact-form";
import { updateCustomerContact } from "@/app/dashboard/customer-contacts/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RecordDialog } from "@/components/ui/record-dialog";

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

  const handleUpdate = async (data: CustomerContactFormValues) => {
    const result = await updateCustomerContact(contact.id, data);
    if (result.success) {
      setOpen(false);
      onSuccess?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Kontakt bearbeiten"
      description={`Bearbeiten Sie die Daten für ${contact.first_name} ${contact.last_name}.`}
      icon={<Users className="h-5 w-5 text-primary" />}
      size="lg"
    >
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
            <p>Kontakt bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CustomerContactForm
        initialData={{
          customerId: contact.customer_id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          role: contact.role || undefined,
        }}
        onSubmit={handleUpdate}
        submitButtonText="Änderungen speichern"
        onSuccess={() => setOpen(false)}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
