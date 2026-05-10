"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";
import { RecordDialog } from "@/components/ui/record-dialog";
import { DialogTrigger } from "@/components/ui/dialog";

interface GiveGeneralFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
  onSuccess?: () => void;
}

export function GiveGeneralFeedbackDialog({ onFeedbackSubmitted, onSuccess }: GiveGeneralFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Allgemeines Feedback einreichen"
      description="Formular zum Einreichen von allgemeinem Feedback."
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
      size="lg"
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
          <MessageSquare className="mr-2 h-4 w-4" /> Allgemeines Feedback geben
        </Button>
      </DialogTrigger>

      <GeneralDashboardFeedbackForm
        key={open ? "give-general-feedback-open" : "give-general-feedback-closed"}
        onSuccess={() => {
          setOpen(false);
          onSuccess?.();
        }}
      />
    </RecordDialog>
  );
}