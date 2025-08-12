"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface GiveGeneralFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
}

export function GiveGeneralFeedbackDialog({ onFeedbackSubmitted }: GiveGeneralFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MessageSquare className="mr-2 h-4 w-4" /> Allgemeines Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "give-general-feedback-open" : "give-general-feedback-closed"} aria-labelledby="give-general-feedback-dialog-title" aria-describedby="give-general-feedback-dialog-description">
        <DialogHeader>
          <DialogTitle id="give-general-feedback-dialog-title">Allgemeines Feedback einreichen</DialogTitle>
          <DialogDescription id="give-general-feedback-dialog-description">
            <VisuallyHidden>Formular zum Einreichen von allgemeinem Feedback.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <GeneralDashboardFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}