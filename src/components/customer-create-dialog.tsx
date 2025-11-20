"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, FileStack } from "lucide-react";
import { CustomerForm, CustomerFormValues } from "@/components/customer-form";
import { createCustomer } from "@/app/dashboard/customers/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";

interface CustomerCreateDialogProps {
  onCustomerCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CustomerCreateDialog({ onCustomerCreated, trigger }: CustomerCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleCreate = async (data: CustomerFormValues) => {
    const result = await createCustomer(data);
    if (result.success) {
      setOpenState(false);
      onCustomerCreated?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Neuen Kunden hinzufügen"
      description="Erfassen Sie die Stammdaten für einen neuen Kunden oder Partner."
      icon={<Building2 className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Neuen Kunden hinzufügen
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
              onSubmit={handleCreate}
              submitButtonText="Kunden erstellen"
              onSuccess={() => {}}
              isInDialog={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            {!createdCustomerId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileStack className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dokumente hochladen</h3>
                <p className="text-muted-foreground mb-4">
                  Speichern Sie zuerst den Kunden, um Dokumente hochzuladen.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
                <h3 className="text-md font-semibold flex items-center">
                  <FileStack className="mr-2 h-5 w-5" /> Dokumente
                </h3>
                <DocumentUploader
                  associatedCustomerId={createdCustomerId}
                  onDocumentUploaded={() => {}}
                />
                <DocumentList associatedCustomerId={createdCustomerId} />
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
