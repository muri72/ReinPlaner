"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building, FileStack } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";

interface ObjectCreateDialogProps {
  customerId?: string;
  onObjectCreated?: (newObjectId: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ObjectCreateDialog({
  customerId,
  onObjectCreated,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ObjectCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [createdObjectId, setCreatedObjectId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const justOpenedRef = useRef(false);

  const setOpenState = (next: boolean) => {
    if (next && !open) {
      // Reset form when opening dialog
      setFormKey(prev => prev + 1);
      setCreatedObjectId(null);
      setActiveTab("details");
      justOpenedRef.current = true;
    }
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  // Prevent autofocus on first field when dialog opens
  useEffect(() => {
    if (open && justOpenedRef.current) {
      // Blur any focused element inside the dialog after a short delay
      const timer = setTimeout(() => {
        const focused = document.activeElement as HTMLElement | null;
        if (focused && document.contains(focused)) {
          focused.blur();
        }
        justOpenedRef.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Ensure dialog content scrolls to top when opening
  useEffect(() => {
    if (open) {
      // Scroll the dialog content to top using multiple strategies
      const scrollToTop = () => {
        // Try data attribute first
        const content = document.querySelector("[data-dialog-content]");
        if (content) {
          content.scrollTop = 0;
        }
        // Also scroll the form wrapper to top
        const form = document.querySelector("[data-dialog-content] form");
        if (form) {
          form.scrollTop = 0;
        }
        // Fallback: scroll window to top if dialog is full-page
        window.scrollTo({ top: 0, behavior: "instant" });
      };
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(scrollToTop);
    }
  }, [open]);

  const handleCreate = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    if (result.success) {
      if (result.newObjectId) {
        setCreatedObjectId(result.newObjectId);
        setActiveTab("documents");
        onObjectCreated?.(result.newObjectId);
      } else {
        setOpenState(false);
        onObjectCreated?.("");
      }
    }
    return result;
  };

  return (
<RecordDialog
        open={open}
        onOpenChange={setOpenState}
        title="Neues Objekt erstellen"
        description="Erstellen Sie ein neues Objekt für einen Kunden."
        icon={<Building className="h-5 w-5 text-primary" />}
        size="lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Neues Objekt erstellen
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
            <ObjectForm
              key={`object-create-form-${formKey}`}
              initialData={customerId ? { customerId } : undefined}
              onSubmit={handleCreate}
              submitButtonText="Objekt erstellen"
              onSuccess={() => {}}
              isInDialog={true}
              isCreateMode={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            {!createdObjectId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileStack className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dokumente hochladen</h3>
                <p className="text-muted-foreground mb-4">
                  Speichern Sie zuerst das Objekt, um Dokumente hochzuladen.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
                <h3 className="text-md font-semibold flex items-center">
                  <FileStack className="mr-2 h-5 w-5" /> Dokumente
                </h3>
                <DocumentUploader
                  associatedObjectId={createdObjectId}
                  onDocumentUploaded={() => {}}
                />
                <DocumentList associatedObjectId={createdObjectId} />
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
