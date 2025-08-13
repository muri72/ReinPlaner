"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { createCustomer } from "@/app/dashboard/customers/actions";
// Removed unused import: import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CustomerCreateDialogProps {
  onCustomerCreated?: () => void;
}

export function CustomerCreateDialog({ onCustomerCreated }: CustomerCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `customer-create-dialog-title`;
  const descriptionId = `customer-create-dialog-description`;

  const handleCreate = async (data: CustomerFormValues) => {
    const result = await createCustomer(data);
    if (result.success) {
      setOpen(false);
      onCustomerCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Kunden hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "customer-create-open" : "customer-create-closed"} 
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neuen Kunden hinzufügen</DialogTitle>
          <DialogDescription id={descriptionId} className="sr-only">
            Formular zum Hinzufügen eines neuen Kunden.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          onSubmit={handleCreate}
          submitButtonText="Kunden hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}