"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { updateOrder } from "@/app/dashboard/orders/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Definierte Liste der Dienstleistungen (muss mit order-form.tsx übereinstimmen)
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

interface OrderEditDialogProps {
  order: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    customer_id: string | null;
    object_id: string | null;
    employee_id: string | null;
    customer_contact_id: string | null;
    order_type: string;
    recurring_start_date: string | null;
    recurring_end_date: string | null;
    priority: string;
    estimated_hours: number | null;
    notes: string | null;
    service_type: string | null;
    request_status: string;
  };
}

export function OrderEditDialog({ order }: OrderEditDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `order-edit-dialog-title`;
  const descriptionId = `order-edit-dialog-description`;

  const handleUpdate = async (data: OrderFormValues) => {
    const result = await updateOrder(order.id, data);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  // Hilfsfunktion, um service_type sicher in den Enum-Typ umzuwandeln
  const getServiceTypeForForm = (serviceType: string | null): OrderFormValues["serviceType"] => {
    if (serviceType && availableServices.includes(serviceType as any)) {
      return serviceType as OrderFormValues["serviceType"];
    }
    return null;
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
            <p>Auftrag bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "order-edit-open" : "order-edit-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Auftrag bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten der Auftragsdetails.
          </DialogDescription>
        </DialogHeader>
        <OrderForm
          initialData={{
            title: order.title,
            description: order.description || undefined,
            dueDate: order.due_date ? new Date(order.due_date) : undefined,
            status: order.status as OrderFormValues["status"],
            customerId: order.customer_id ?? undefined,
            objectId: order.object_id ?? undefined,
            employeeId: order.employee_id,
            customerContactId: order.customer_contact_id ?? undefined,
            orderType: order.order_type as OrderFormValues["orderType"],
            recurringStartDate: order.recurring_start_date ? new Date(order.recurring_start_date) : undefined,
            recurringEndDate: order.recurring_end_date ? new Date(order.recurring_end_date) : undefined,
            priority: order.priority as OrderFormValues["priority"],
            estimatedHours: order.estimated_hours,
            notes: order.notes,
            serviceType: getServiceTypeForForm(order.service_type),
            requestStatus: order.request_status as OrderFormValues["requestStatus"],
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}