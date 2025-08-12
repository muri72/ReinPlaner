"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle, Star } from "lucide-react";
import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

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
      <DialogContent key={open ? "give-order-feedback-open" : "give-order-feedback-closed"} aria-labelledby="give-order-feedback-dialog-title" aria-describedby="give-order-feedback-dialog-description">
        <DialogHeader>
          <DialogTitle id="give-order-feedback-dialog-title">Auftragsbezogenes Feedback einreichen</DialogTitle>
          <DialogDescription id="give-order-feedback-dialog-description">
            <VisuallyHidden>Formular zum Einreichen von Feedback zu einem bestimmten Auftrag.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <GiveFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}