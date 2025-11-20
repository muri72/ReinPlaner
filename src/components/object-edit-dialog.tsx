"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Building, FileStack } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { updateObject } from "@/app/dashboard/objects/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ObjectEditDialogProps {
  object: {
    id: string;
    name: string;
    address: string;
    description: string | null;
    customer_id: string;
    customer_contact_id: string | null;
    notes: string | null;
    priority: string;
    time_of_day: string;
    access_method: string;
    pin: string | null;
    is_alarm_secured: boolean;
    alarm_password: string | null;
    security_code_word: string | null;
    daily_schedules: any[];
    recurrence_interval_weeks: number;
    start_week_offset: number;
  };
  trigger?: React.ReactNode;
}

export function ObjectEditDialog({ object, trigger }: ObjectEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleUpdate = async (data: ObjectFormValues) => {
    const result = await updateObject(object.id, data);
    if (result.success) {
      setInternalOpen(false);
    }
    return result;
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setInternalOpen}
      title="Objekt bearbeiten"
      description={`Aktualisieren Sie die Daten für ${object.name}.`}
      icon={<Building className="h-5 w-5 text-primary" />}
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
            <ObjectForm
              key={`object-form-${object.id}-${internalOpen}`}
              isInDialog={true}
              initialData={{
                name: object.name,
                address: object.address,
                description: object.description,
                customerId: object.customer_id,
                customerContactId: object.customer_contact_id,
                notes: object.notes,
                priority: object.priority as ObjectFormValues["priority"],
                timeOfDay: object.time_of_day as ObjectFormValues["timeOfDay"],
                accessMethod: object.access_method as ObjectFormValues["accessMethod"],
                pin: object.pin,
                isAlarmSecured: object.is_alarm_secured,
                alarmPassword: object.alarm_password,
                securityCodeWord: object.security_code_word,
                daily_schedules: object.daily_schedules,
                recurrence_interval_weeks: object.recurrence_interval_weeks,
                start_week_offset: object.start_week_offset,
              }}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => setInternalOpen(false)}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              <h3 className="text-md font-semibold flex items-center">
                <FileStack className="mr-2 h-5 w-5" /> Dokumente
              </h3>
              <DocumentUploader
                associatedObjectId={object.id}
                onDocumentUploaded={() => {}}
              />
              <DocumentList associatedObjectId={object.id} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
