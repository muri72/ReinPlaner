"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { createOrder } from "@/app/dashboard/orders/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface OrderCreateDialogProps {
  onOrderCreated?: () => void;
}

export function OrderCreateDialog({ onOrderCreated }: OrderCreateDialogProps) {
  const [open, setOpen] = useState(false);

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
      <DialogContent key={open ? "order-create-open" : "order-create-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="order-create-dialog-title" aria-describedby="order-create-dialog-description">
        <DialogHeader>
          <DialogTitle id="order-create-dialog-title">Neuen Auftrag hinzufügen</DialogTitle>
          <DialogDescription id="order-create-dialog-description">
            <VisuallyHidden>Formular zum Hinzufügen eines neuen Auftrags.</VisuallyHidden>
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