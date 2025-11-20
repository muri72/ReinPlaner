"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserCog, FileStack } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { createEmployee } from "@/app/dashboard/employees/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";

interface EmployeeCreateDialogProps {
  onEmployeeCreated?: () => void;
  trigger?: React.ReactNode;
}

export function EmployeeCreateDialog({ onEmployeeCreated, trigger }: EmployeeCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const setOpenState = (next: boolean) => {
    if (next && !internalOpen) {
      // Reset form when opening dialog
      setFormKey(prev => prev + 1);
      setCreatedEmployeeId(null);
      setActiveTab("details");
    }
    setInternalOpen(next);
  };

  const handleCreate = async (data: EmployeeFormValues) => {
    const result = await createEmployee(data);
    if (result.success) {
      setOpenState(false);
      onEmployeeCreated?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Neuen Mitarbeiter hinzufügen"
      description="Erfassen Sie die Stammdaten für einen neuen Mitarbeiter."
      icon={<UserCog className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Neuen Mitarbeiter hinzufügen
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
            <EmployeeForm
              key={`employee-create-form-${formKey}`}
              onSubmit={handleCreate}
              submitButtonText="Mitarbeiter erstellen"
              onSuccess={() => {}}
              isInDialog={true}
              isCreateMode={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            {!createdEmployeeId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileStack className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dokumente hochladen</h3>
                <p className="text-muted-foreground mb-4">
                  Speichern Sie zuerst den Mitarbeiter, um Dokumente hochzuladen.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
                <h3 className="text-md font-semibold flex items-center">
                  <FileStack className="mr-2 h-5 w-5" /> Dokumente
                </h3>
                <DocumentUploader
                  associatedEmployeeId={createdEmployeeId}
                  onDocumentUploaded={() => {}}
                />
                <DocumentList associatedEmployeeId={createdEmployeeId} />
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
