"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface GiveGeneralFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
}

export function GiveGeneralFeedbackDialog({ onFeedbackSubmitted }: GiveGeneralFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `give-general-feedback-dialog-title`;
  const descriptionId = `give-general-feedback-dialog-description`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MessageSquare className="mr-2 h-4 w-4" /> Allgemeines Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "give-general-feedback-open" : "give-general-feedback-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Allgemeines Feedback einreichen</DialogTitle>
          <DialogDescription>
            Formular zum Einreichen von allgemeinem Feedback.
          </DialogDescription>
        </DialogHeader>
        <GeneralDashboardFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}