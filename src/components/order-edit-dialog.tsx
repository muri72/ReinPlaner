"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form"; // Korrigierter Import
import { updateOrder } from "@/app/dashboard/orders/actions"; // Korrigierter Import

interface OrderEditDialogProps { // TaskEditDialogProps zu OrderEditDialogProps
  order: { // task zu order
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    customer_id: string; // Neue Felder
    object_id: string;   // Neue Felder
    employee_id: string | null; // Neue Felder
  };
}

export function OrderEditDialog({ order }: OrderEditDialogProps) { // task zu order
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: OrderFormValues) => {
    const result = await updateOrder(order.id, data); // updateTask zu updateOrder, task.id zu order.id
    if (result.success) {
      setOpen(false);
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
          <DialogTitle>Auftrag bearbeiten</DialogTitle> {/* Aufgabe zu Auftrag */}
        </DialogHeader>
        <OrderForm // TaskForm zu OrderForm
          initialData={{
            title: order.title,
            description: order.description || undefined,
            dueDate: order.due_date ? new Date(order.due_date) : undefined,
            status: order.status as OrderFormValues["status"],
            customerId: order.customer_id, // Neue Felder
            objectId: order.object_id,     // Neue Felder
            employeeId: order.employee_id, // Neue Felder
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}