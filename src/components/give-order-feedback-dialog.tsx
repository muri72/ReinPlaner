"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Star } from "lucide-react";
import { GiveFeedbackForm } from "@/components/give-feedback-form";

interface GiveOrderFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
}

export function GiveOrderFeedbackDialog({ onFeedbackSubmitted }: GiveOrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Star className="mr-2 h-4 w-4" /> Auftrags-Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "give-order-feedback-open" : "give-order-feedback-closed"} className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" aria-labelledby="give-order-feedback-dialog-title">
        <DialogHeader>
          <DialogTitle id="give-order-feedback-dialog-title">Auftragsbezogenes Feedback einreichen</DialogTitle>
        </DialogHeader>
        <GiveFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}