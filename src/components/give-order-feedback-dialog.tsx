"use client";

import { useState } from "react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { DialogTrigger } from "@/components/ui/dialog";

interface GiveOrderFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
  onSuccess?: () => void;
}

export function GiveOrderFeedbackDialog({ onFeedbackSubmitted, onSuccess }: GiveOrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Auftragsbezogenes Feedback einreichen"
      description="Formular zum Einreichen von Feedback zu einem bestimmten Auftrag."
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
        <Button className="w-full">
          <Star className="mr-2 h-4 w-4" /> Auftrags-Feedback geben
        </Button>
      </DialogTrigger>
      <GiveFeedbackForm isInDialog={true} onSuccess={() => {
        setOpen(false);
        onSuccess?.();
      }} />
    </RecordDialog>
  );
}