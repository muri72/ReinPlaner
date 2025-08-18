"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Star } from "lucide-react";
import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface GiveOrderFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
  onSuccess?: () => void; // Hinzugefügt
}

export function GiveOrderFeedbackDialog({ onFeedbackSubmitted, onSuccess }: GiveOrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Star className="mr-2 h-4 w-4" /> Auftrags-Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "give-order-feedback-open" : "give-order-feedback-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Auftragsbezogenes Feedback einreichen</DialogTitle>
          <DialogDescription>
            Formular zum Einreichen von Feedback zu einem bestimmten Auftrag.
          </DialogDescription>
        </DialogHeader>
        <GiveFeedbackForm onSuccess={() => {
          setOpen(false);
          onSuccess?.(); // Ruft die onSuccess-Prop des Dialogs auf
        }} />
      </DialogContent>
    </Dialog>
  );
}