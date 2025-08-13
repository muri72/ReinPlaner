"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { updateCustomer } from "@/app/dashboard/customers/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CustomerEditDialogProps {
  customer: {
    id: string;
    name: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    customer_type: string; // Neues Feld
  };
}

export function CustomerEditDialog({ customer }: CustomerEditDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `customer-edit-dialog-title`;
  const descriptionId = `customer-edit-dialog-description`;

  const handleUpdate = async (data: CustomerFormValues) => {
    const result = await updateCustomer(customer.id, data);
    if (result.success) {
      setOpen(false); // Dialog schließen bei Erfolg
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
            <p>Kunden bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "customer-edit-open" : "customer-edit-closed"} 
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Kunden bearbeiten</DialogTitle>
          <DialogDescription id={descriptionId}>
            <VisuallyHidden>Formular zum Bearbeiten der Kundendaten.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          initialData={{
            name: customer.name,
            address: customer.address,
            contactEmail: customer.contact_email,
            contactPhone: customer.contact_phone,
            customerType: customer.customer_type as CustomerFormValues["customerType"], // Neues Feld
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)} // Schließt den Dialog nach erfolgreicher Aktualisierung
        />
      </DialogContent>
    </Dialog>
  );
}