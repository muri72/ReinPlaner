"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { updateObject } from "@/app/dashboard/objects/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
    daily_schedules: any[]; // Updated to JSONB array
    total_weekly_hours: number | null;
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
            <p>Objekt bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </DialogProvider>
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
        <div className="flex-grow overflow-y-auto pr-4"> {/* Added flex-grow and overflow-y-auto */}
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
              daily_schedules: object.daily_schedules,
              recurrence_interval_weeks: object.recurrence_interval_weeks,
              start_week_offset: object.start_week_offset,
            }}
            onSubmit={handleUpdate}
            submitButtonText="Änderungen speichern"
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}