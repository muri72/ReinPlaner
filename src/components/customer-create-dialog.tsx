"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { createCustomer } from "@/app/dashboard/customers/actions";

interface CustomerCreateDialogProps {
  onCustomerCreated?: () => void;
}

export function CustomerCreateDialog({ onCustomerCreated }: CustomerCreateDialogProps) {
  const [open, setOpen] = useState(false);

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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="customer-create-dialog-title">
        <DialogHeader>
          <DialogTitle id="customer-create-dialog-title">Neuen Kunden hinzufügen</DialogTitle>
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