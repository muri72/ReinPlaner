"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderForm, OrderFormValues, AssignedEmployee } from "@/components/order-form";
import { updateOrder } from "@/app/dashboard/orders/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { FileStack } from "lucide-react";

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
    customer_contact_id: string | null;
    order_type: string;
    recurring_start_date: string | null;
    recurring_end_date: string | null;
    priority: string;
    total_estimated_hours: number | null;
    fixed_monthly_price: number | null;
    notes: string | null;
    service_type: string | null;
    request_status: string;
    assignedEmployees: AssignedEmployee[]; // Use the correct, structured type
  };
}

export function OrderEditDialog({ order }: OrderEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const router = useRouter();

  // Update currentOrder when the prop changes (e.g., when dialog reopens with new data)
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const handleUpdate = async (data: OrderFormValues) => {
    const result = await updateOrder(currentOrder.id, data);
    if (result.success) {
      // Store current path before refresh to maintain pagination
      const currentPath = window.location.pathname + window.location.search;
      setOpen(false);
      // Refresh to show updated data and restore pagination state
      router.refresh();
      // Restore the original URL with all parameters (like page=2)
      router.replace(currentPath);
    }
    return result;
  };

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
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Auftrag bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten der Auftragsdetails.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Dokumente</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-grow overflow-y-auto pr-4">
            <OrderForm
              key={`order-form-${currentOrder.id}-${open}`} // Force remount when dialog opens/closes or order changes
              initialData={{
                title: currentOrder.title,
                description: currentOrder.description || undefined,
                dueDate: currentOrder.due_date ? new Date(currentOrder.due_date) : undefined,
                status: currentOrder.status as OrderFormValues["status"],
                customerId: currentOrder.customer_id ?? undefined,
                objectId: currentOrder.object_id ?? undefined,
                customerContactId: currentOrder.customer_contact_id ?? undefined,
                orderType: currentOrder.order_type as OrderFormValues["orderType"],
                recurringStartDate: currentOrder.recurring_start_date ? new Date(currentOrder.recurring_start_date) : undefined,
                recurringEndDate: currentOrder.recurring_end_date ? new Date(currentOrder.recurring_end_date) : undefined,
                priority: currentOrder.priority as OrderFormValues["priority"],
                totalEstimatedHours: currentOrder.total_estimated_hours,
                fixedMonthlyPrice: currentOrder.fixed_monthly_price,
                notes: currentOrder.notes,
                serviceType: getServiceTypeForForm(currentOrder.service_type),
                requestStatus: currentOrder.request_status as OrderFormValues["requestStatus"],
                assignedEmployees: currentOrder.assignedEmployees,
              }}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="documents" className="flex-grow overflow-y-auto pr-4 space-y-4">
            <h3 className="text-md font-semibold flex items-center">
              <FileStack className="mr-2 h-5 w-5" /> Dokumente
            </h3>
            <DocumentUploader associatedOrderId={currentOrder.id} onDocumentUploaded={() => { /* Re-fetch documents if needed */ }} />
            <DocumentList associatedOrderId={currentOrder.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}