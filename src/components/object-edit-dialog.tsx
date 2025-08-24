"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { updateObject } from "@/app/dashboard/objects/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { FileStack } from "lucide-react";

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
    daily_schedules: any; // JSONB field
    recurrence_interval_weeks: number;
    start_week_offset: number;
  };
}

export function ObjectEditDialog({ object }: ObjectEditDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  const handleUpdate = async (data: ObjectFormValues) => {
    const result = await updateObject(object.id, data);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Objekt bearbeiten</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent 
          key={open ? "object-edit-open" : "object-edit-closed"} 
          className="sm:max-w-5xl max-h-[90vh] flex flex-col glassmorphism-card" // Changed sm:max-w-3xl to sm:max-w-5xl
        >
          <DialogHeader>
            <DialogTitle>Objekt bearbeiten</DialogTitle>
            <DialogDescription>
              Formular zum Bearbeiten der Objektdaten.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details" className="flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Dokumente</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="flex-grow overflow-y-auto pr-4">
              <ObjectForm
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
                  daily_schedules: JSON.stringify(object.daily_schedules), // Pass JSONB as string
                  recurrence_interval_weeks: object.recurrence_interval_weeks,
                  start_week_offset: object.start_week_offset,
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
              <DocumentUploader associatedOrderId={object.id} />
              <DocumentList associatedOrderId={object.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}