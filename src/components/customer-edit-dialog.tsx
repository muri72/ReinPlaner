"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Building2, FileStack } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { updateCustomer } from "@/app/dashboard/customers/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";

interface CustomerEditDialogProps {
  customer: {
    id: string;
    user_id: string;
    name: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string | null;
    customer_type: string;
    contractual_services: string | null;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CustomerEditDialog({ customer, trigger, onSuccess }: CustomerEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleUpdate = async (data: CustomerFormValues) => {
    const result = await updateCustomer(customer.id, data);
    if (result.success) {
      setInternalOpen(false);
      onSuccess?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Kunden bearbeiten"
      description={`Aktualisieren Sie die Stammdaten für ${customer.name}.`}
      icon={<Building2 className="h-5 w-5 text-primary" />}
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
            <CustomerForm
              key={`customer-form-${customer.id}-${internalOpen}`}
              initialData={{
                name: customer.name,
                address: customer.address,
                contactEmail: customer.contact_email,
                contactPhone: customer.contact_phone,
                customerType: customer.customer_type as CustomerFormValues["customerType"],
                contractualServices: customer.contractual_services,
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
                associatedCustomerId={customer.id}
                onDocumentUploaded={() => {}}
              />
              <DocumentList associatedCustomerId={customer.id} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
