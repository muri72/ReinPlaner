"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { createOrder } from "@/app/dashboard/orders/actions";
// Removed import: VisuallyHidden

interface OrderCreateDialogProps {
  onOrderCreated?: () => void;
}

export function OrderCreateDialog({ onOrderCreated }: OrderCreateDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

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
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
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