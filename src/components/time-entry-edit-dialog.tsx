"use client";

import { useState } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Clock } from "lucide-react";
import { TimeEntryForm, TimeEntryFormValues } from "@/components/time-entry-form";
import { updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RecordDialog } from "@/components/ui/record-dialog";

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
    break_minutes: number | null;
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
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Zeiteintrag bearbeiten"
      description="Bearbeiten Sie die Details des Zeiteintrags."
      icon={<Clock className="h-5 w-5 text-primary" />}
      size="lg"
    >
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

      <TimeEntryForm
        initialData={{
          employeeId: timeEntry.employee_id || undefined,
          customerId: timeEntry.customer_id || undefined,
          objectId: timeEntry.object_id || undefined,
          orderId: timeEntry.order_id || undefined,
          startDate: new Date(timeEntry.start_time),
          endDate: timeEntry.end_time ? new Date(timeEntry.end_time) : undefined,
          breakMinutes: timeEntry.break_minutes || undefined,
          type: timeEntry.type as TimeEntryFormValues["type"],
          notes: timeEntry.notes || undefined,
        }}
        onSubmit={handleUpdate}
        submitButtonText="Änderungen speichern"
        onSuccess={() => setOpen(false)}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
