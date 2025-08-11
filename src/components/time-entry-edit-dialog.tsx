"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { TimeEntryForm, TimeEntryFormValues } from "@/components/time-entry-form";
import { updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

interface TimeEntryEditDialogProps {
  timeEntry: {
    id: string;
    employee_id: string | null;
    customer_id: string | null;
    object_id: string | null;
    order_id: string | null;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    break_minutes: number | null; // Neues Feld
    type: string;
    notes: string | null;
  };
  currentUserId: string;
  isAdmin: boolean;
}

export function TimeEntryEditDialog({ timeEntry, currentUserId, isAdmin }: TimeEntryEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: TimeEntryFormValues) => {
    const result = await updateTimeEntry(timeEntry.id, data);
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
            <p>Zeiteintrag bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
        </DialogHeader>
        <TimeEntryForm
          initialData={{
            employeeId: timeEntry.employee_id,
            customerId: timeEntry.customer_id,
            objectId: timeEntry.object_id,
            orderId: timeEntry.order_id,
            startDate: new Date(timeEntry.start_time),
            startTime: new Date(timeEntry.start_time).toTimeString().slice(0, 5),
            endDate: timeEntry.end_time ? new Date(timeEntry.end_time) : null,
            endTime: timeEntry.end_time ? new Date(timeEntry.end_time).toTimeString().slice(0, 5) : null,
            durationMinutes: timeEntry.duration_minutes,
            breakMinutes: timeEntry.break_minutes, // Neues Feld übergeben
            type: timeEntry.type as TimeEntryFormValues["type"],
            notes: timeEntry.notes,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
}