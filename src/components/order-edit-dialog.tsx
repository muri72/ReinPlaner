"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, ShoppingCart, FileStack } from "lucide-react";
import { OrderForm, OrderFormValues, AssignedEmployee } from "@/components/order-form";
import { updateOrder } from "@/app/dashboard/orders/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseLocalDate } from "@/lib/utils";

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
    status: string;
    customer_id: string | null;
    object_id: string | null;
    customer_contact_id: string | null;
    order_type: string;
    start_date: string | null;
    end_date: string | null;
    priority: string;
    total_estimated_hours: number | null;
    fixed_monthly_price: number | null;
    notes: string | null;
    service_type: string | null;
    service_key: string | null;
    markup_percentage: number | null;
    custom_hourly_rate: number | null;
    request_status: string;
    assignedEmployees: AssignedEmployee[]; // Use the correct, structured type
  };
  trigger?: React.ReactNode;
}

export function OrderEditDialog({ order, trigger }: OrderEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [currentOrder, setCurrentOrder] = useState(order);
  const router = useRouter();

  // Update currentOrder when the prop changes (e.g., when dialog reopens with new data)
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleUpdate = async (data: OrderFormValues) => {
    const result = await updateOrder(currentOrder.id, data);
    if (result.success) {
      // Store current path before refresh to maintain pagination
      const currentPath = window.location.pathname + window.location.search;
      setOpenState(false);
      // Refresh to show updated data and restore pagination state
      router.refresh();
      // Restore the original URL with all parameters (like page=2)
      router.replace(currentPath);
    }
    return result;
  };

  const getServiceTypeForForm = (serviceType: string | null, serviceKey: string | null): { serviceType: OrderFormValues["serviceType"], serviceKey: string | null } => {
    // Use serviceKey if available, otherwise fallback to serviceType
    if (serviceKey) {
      return { serviceType: serviceType as OrderFormValues["serviceType"], serviceKey };
    }
    if (serviceType && availableServices.includes(serviceType as any)) {
      return { serviceType: serviceType as OrderFormValues["serviceType"], serviceKey: null };
    }
    return { serviceType: null, serviceKey: null };
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Auftrag bearbeiten"
      description="Bearbeiten Sie die Details und Einstellungen des Auftrags."
      icon={<ShoppingCart className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            <FileStack className="mr-2 h-4 w-4" />
            Dokumente
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="details" className="h-full m-0 p-0">
            <OrderForm
              key={`order-form-${currentOrder.id}-${internalOpen}`} // Force remount when dialog opens/closes or order changes
              initialData={{
                title: currentOrder.title,
                description: currentOrder.description || undefined,
                status: currentOrder.status as OrderFormValues["status"],
                customerId: currentOrder.customer_id ?? undefined,
                objectId: currentOrder.object_id ?? undefined,
                customerContactId: currentOrder.customer_contact_id ?? undefined,
                orderType: currentOrder.order_type as OrderFormValues["orderType"],
                startDate: currentOrder.start_date ? parseLocalDate(currentOrder.start_date) : null,
                endDate: currentOrder.end_date ? parseLocalDate(currentOrder.end_date) : null,
                priority: currentOrder.priority as OrderFormValues["priority"],
                totalEstimatedHours: currentOrder.total_estimated_hours,
                fixedMonthlyPrice: currentOrder.fixed_monthly_price,
                notes: currentOrder.notes,
                serviceType: currentOrder.service_type || null,
                serviceKey: currentOrder.service_key || null,
                markupPercentage: currentOrder.markup_percentage,
                customHourlyRate: currentOrder.custom_hourly_rate,
                requestStatus: currentOrder.request_status as OrderFormValues["requestStatus"],
                assignedEmployees: currentOrder.assignedEmployees,
              }}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => setInternalOpen(false)}
              isInDialog={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              <h3 className="text-md font-semibold flex items-center">
                <FileStack className="mr-2 h-5 w-5" /> Dokumente
              </h3>
              <DocumentUploader
                associatedOrderId={currentOrder.id}
                onDocumentUploaded={() => {}}
              />
              <DocumentList associatedOrderId={currentOrder.id} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
