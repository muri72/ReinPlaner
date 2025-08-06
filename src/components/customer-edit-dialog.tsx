"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { updateCustomer } from "@/app/dashboard/customers/actions";

interface CustomerEditDialogProps {
  customer: {
    id: string;
    name: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  };
}

export function CustomerEditDialog({ customer }: CustomerEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: CustomerFormValues) => {
    const result = await updateCustomer(customer.id, data);
    if (result.success) {
      setOpen(false); // Dialog schließen bei Erfolg
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kunden bearbeiten</DialogTitle>
        </DialogHeader>
        <CustomerForm
          initialData={{
            name: customer.name,
            address: customer.address,
            contactEmail: customer.contact_email,
            contactPhone: customer.contact_phone,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)} // Schließt den Dialog nach erfolgreicher Aktualisierung
        />
      </DialogContent>
    </Dialog>
  );
}