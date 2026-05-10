"use client";

import { useState } from "react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { OrderFeedbackForm } from "@/components/order-feedback-form";
import { DialogTrigger } from "@/components/ui/dialog";

interface OrderFeedbackDialogProps {
  orderId: string;
}

export function OrderFeedbackDialog({ orderId }: OrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Feedback zum Auftrag"
      description="Formular zum Einreichen von Feedback zu einem Auftrag."
      icon={<Star className="h-5 w-5" />}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      }
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Star className="mr-2 h-4 w-4" /> Feedback geben
        </Button>
      </DialogTrigger>
      <OrderFeedbackForm orderId={orderId} onSuccess={() => setOpen(false)} isInDialog={true} />
    </RecordDialog>
  );
}