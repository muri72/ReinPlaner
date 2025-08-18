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
    monday_start_time: string | null;
    monday_end_time: string | null;
    tuesday_start_time: string | null;
    tuesday_end_time: string | null;
    wednesday_start_time: string | null;
    wednesday_end_time: string | null;
    thursday_start_time: string | null;
    thursday_end_time: string | null;
    friday_start_time: string | null;
    friday_end_time: string | null;
    saturday_start_time: string | null;
    saturday_end_time: string | null;
    sunday_start_time: string | null;
    sunday_end_time: string | null;
    monday_hours: number | null;
    tuesday_hours: number | null;
    wednesday_hours: number | null;
    thursday_hours: number | null;
    friday_hours: number | null;
    saturday_hours: number | null;
    sunday_hours: number | null;
    total_weekly_hours: number | null; // Dieses Feld wird entfernt
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
      </TooltipProvider>
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
              monday_start_time: object.monday_start_time,
              monday_end_time: object.monday_end_time,
              tuesday_start_time: object.tuesday_start_time,
              tuesday_end_time: object.tuesday_end_time,
              wednesday_start_time: object.wednesday_start_time,
              wednesday_end_time: object.wednesday_end_time,
              thursday_start_time: object.thursday_start_time,
              thursday_end_time: object.thursday_end_time,
              friday_start_time: object.friday_start_time,
              friday_end_time: object.friday_end_time,
              saturday_start_time: object.saturday_start_time,
              saturday_end_time: object.saturday_end_time,
              sunday_start_time: object.sunday_start_time,
              sunday_end_time: object.sunday_end_time,
              monday_hours: object.monday_hours,
              tuesday_hours: object.tuesday_hours,
              wednesday_hours: object.wednesday_hours,
              thursday_hours: object.thursday_hours,
              friday_hours: object.friday_hours,
              saturday_hours: object.saturday_hours,
              sunday_hours: object.sunday_hours,
              // totalWeeklyHours: object.total_weekly_hours, // Dieses Feld wird entfernt
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