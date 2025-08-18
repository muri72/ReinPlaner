"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { updateOrder } from "@/app/dashboard/orders/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { DocumentUploader } from "@/components/document-uploader"; // Import DocumentUploader
import { DocumentList } from "@/components/document-list"; // Import DocumentList
import { FileStack } from "lucide-react"; // Import FileStack icon

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
    employee_ids: string[] | null; // Changed from employee_id
    customer_contact_id: string | null;
    order_type: string;
    recurring_start_date: string | null;
    recurring_end_date: string | null;
    priority: string;
    total_estimated_hours: number | null; // Changed from estimated_hours
    notes: string | null;
    service_type: string | null;
    request_status: string;
    // Add assigned_daily_hours for each employee if available
    order_employee_assignments: {
      employee_id: string;
      assigned_daily_hours: number | null;
    }[];
  };
}

export function OrderEditDialog({ order }: OrderEditDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

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

  // Prepare employeeAssignments for the form
  const initialEmployeeAssignments = order.employee_ids?.map(empId => {
    const assignment = order.order_employee_assignments?.find(oea => oea.employee_id === empId);
    return {
      employeeId: empId,
      assignedDailyHours: assignment?.assigned_daily_hours || null,
    };
  }) || [];

  // Determine if distribution was equal (if all assigned_daily_hours are null or same)
  const isDistributeEqually = initialEmployeeAssignments.every(a => a.assignedDailyHours === null);

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
        className="sm:max-w-[425px] max-h-[90vh] flex flex-col glassmorphism-card" // Added flex flex-col
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
              initialData={{
                title: order.title,
                description: order.description || undefined,
                dueDate: order.due_date ? new Date(order.due_date) : undefined,
                status: order.status as OrderFormValues["status"],
                customerId: order.customer_id ?? undefined,
                objectId: order.object_id ?? undefined,
                assignedEmployeeIds: order.employee_ids || [], // Pass assigned employee IDs
                employeeAssignments: initialEmployeeAssignments, // Pass individual assignments
                distributeEqually: isDistributeEqually, // Pass the determined distribution type
                customerContactId: order.customer_contact_id ?? undefined,
                orderType: order.order_type as OrderFormValues["orderType"],
                recurringStartDate: order.recurring_start_date ? new Date(order.recurring_start_date) : undefined,
                recurringEndDate: order.recurring_end_date ? new Date(order.recurring_end_date) : undefined,
                priority: order.priority as OrderFormValues["priority"],
                totalEstimatedHours: order.total_estimated_hours, // Use new column
                notes: order.notes,
                serviceType: getServiceTypeForForm(order.service_type),
                requestStatus: order.request_status as OrderFormValues["requestStatus"],
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
            <DocumentUploader associatedOrderId={order.id} onDocumentUploaded={() => { /* Re-fetch documents if needed */ }} />
            <DocumentList associatedOrderId={order.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}