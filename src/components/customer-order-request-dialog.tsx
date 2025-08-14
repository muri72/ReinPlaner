"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerOrderRequestForm, CustomerOrderRequestFormValues } from "@/components/customer-order-request-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CustomerOrderRequestDialogProps {
  customerId: string;
  onOrderRequested?: () => void;
}

export function CustomerOrderRequestDialog({ customerId, onOrderRequested }: CustomerOrderRequestDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Neue Buchung anfragen
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "customer-order-request-open" : "customer-order-request-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Neue Buchung anfragen</DialogTitle>
          <DialogDescription>
            Füllen Sie das Formular aus, um eine neue Reinigungsdienstleistung anzufragen.
          </DialogDescription>
        </DialogHeader>
        <CustomerOrderRequestForm
          customerId={customerId}
          onSuccess={() => {
            setOpen(false);
            onOrderRequested?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}