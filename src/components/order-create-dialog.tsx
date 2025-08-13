"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { createOrder } from "@/app/dashboard/orders/actions";
// VisuallyHidden is no longer needed for sr-only

interface OrderCreateDialogProps {
  onOrderCreated?: () => void;
}

export function OrderCreateDialog({ onOrderCreated }: OrderCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `order-create-dialog-title`;
  const descriptionId = `order-create-dialog-description`;

  const handleCreate = async (data: OrderFormValues) => {
    const result = await createOrder(data);
    if (result.success) {
      setOpen(false);
      onOrderCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Auftrag hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "order-create-open" : "order-create-closed"} 
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neuen Auftrag hinzufügen</DialogTitle>
          <DialogDescription id={descriptionId} className="sr-only">
            Formular zum Hinzufügen eines neuen Auftrags.
          </DialogDescription>
        </DialogHeader>
        <OrderForm
          onSubmit={handleCreate}
          submitButtonText="Auftrag hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}