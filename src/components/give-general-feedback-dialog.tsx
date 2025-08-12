"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" aria-labelledby="give-general-feedback-dialog-title">
        <DialogHeader>
          <DialogTitle id="give-general-feedback-dialog-title">Allgemeines Feedback einreichen</DialogTitle>
        </DialogHeader>
        <GeneralDashboardFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}