"use client";

import { useState, type ReactNode } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShoppingCart, FileStack } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { createOrder } from "@/app/dashboard/orders/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState("details");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpenState = (next: boolean) => {
    if (next && !open) {
      // Reset form when opening dialog
      setFormKey(prev => prev + 1);
      setCreatedOrderId(null);
      setActiveTab("details");
    }
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const handleCreate = async (data: OrderFormValues) => {
    const result = await createOrder(data);
    if (result.success) {
      if (result.data?.id) {
        setCreatedOrderId(result.data.id);
        toast.success("Auftrag erfolgreich erstellt!");
        setActiveTab("documents");
        onOrderCreated?.();
      } else {
        setOpenState(false);
        onOrderCreated?.();
      }
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpenState}
      title="Neuen Auftrag hinzufügen"
      description="Erstellen Sie einen neuen Auftrag für einen Kunden."
      icon={<ShoppingCart className="h-5 w-5 text-primary" />}
      size="lg"
    >
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
              key={`order-create-form-${formKey}`}
              onSubmit={handleCreate}
              submitButtonText="Auftrag erstellen"
              onSuccess={() => {}}
              isInDialog={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            {!createdOrderId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileStack className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dokumente hochladen</h3>
                <p className="text-muted-foreground mb-4">
                  Speichern Sie zuerst den Auftrag, um Dokumente hochzuladen.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
                <h3 className="text-md font-semibold flex items-center">
                  <FileStack className="mr-2 h-5 w-5" /> Dokumente
                </h3>
                <DocumentUploader
                  associatedOrderId={createdOrderId}
                  onDocumentUploaded={() => {}}
                />
                <DocumentList associatedOrderId={createdOrderId} />
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}