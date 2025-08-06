"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { updateObject } from "@/app/dashboard/objects/actions";

interface ObjectEditDialogProps {
  object: {
    id: string;
    name: string;
    address: string;
    description: string | null;
    customer_id: string;
    // Neue Felder
    default_notes: string | null;
    default_priority: string;
    default_time_of_day: string;
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
  };
}

export function ObjectEditDialog({ object }: ObjectEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: ObjectFormValues) => {
    const result = await updateObject(object.id, data);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Objekt bearbeiten</DialogTitle>
        </DialogHeader>
        <ObjectForm
          initialData={{
            name: object.name,
            address: object.address,
            description: object.description,
            customerId: object.customer_id,
            defaultNotes: object.default_notes,
            defaultPriority: object.default_priority as ObjectFormValues["defaultPriority"],
            defaultTimeOfDay: object.default_time_of_day as ObjectFormValues["defaultTimeOfDay"],
            accessMethod: object.access_method as ObjectFormValues["accessMethod"],
            pin: object.pin,
            isAlarmSecured: object.is_alarm_secured,
            alarmPassword: object.alarm_password,
            securityCodeWord: object.security_code_word,
            mondayStartTime: object.monday_start_time,
            mondayEndTime: object.monday_end_time,
            tuesdayStartTime: object.tuesday_start_time,
            tuesdayEndTime: object.tuesday_end_time,
            wednesdayStartTime: object.wednesday_start_time,
            wednesdayEndTime: object.wednesday_end_time,
            thursdayStartTime: object.thursday_start_time,
            thursdayEndTime: object.thursday_end_time,
            fridayStartTime: object.friday_start_time,
            fridayEndTime: object.friday_end_time,
            saturdayStartTime: object.saturday_start_time,
            saturdayEndTime: object.saturday_end_time,
            sundayStartTime: object.sunday_start_time,
            sundayEndTime: object.sunday_end_time,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}