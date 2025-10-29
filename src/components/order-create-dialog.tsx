"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { createOrder } from "@/app/dashboard/orders/actions";

interface OrderCreateDialogProps {
  onOrderCreated?: () => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function OrderCreateDialog({
  onOrderCreated,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: OrderCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpenState = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const handleCreate = async (data: OrderFormValues) => {
    const result = await createOrder(data);
    if (result.success) {
      setOpenState(false);
      onOrderCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpenState}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Neuen Auftrag hinzufügen
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        key={open ? "order-create-open" : "order-create-closed"}
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Neuen Auftrag hinzufügen</DialogTitle>
          <DialogDescription>
            Formular zum Hinzufügen eines neuen Auftrags.
          </DialogDescription>
        </DialogHeader>
        <OrderForm
          onSubmit={handleCreate}
          submitButtonText="Auftrag hinzufügen"
          onSuccess={() => setOpenState(false)}
        />
      </DialogContent>
    </Dialog>
  );
}