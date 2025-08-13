"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { GiveFeedbackForm } from "@/components/give-feedback-form";
// Removed import: VisuallyHidden

interface GiveOrderFeedbackDialogProps {
  onFeedbackSubmitted?: () => void;
}

export function GiveOrderFeedbackDialog({ onFeedbackSubmitted }: GiveOrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Star className="mr-2 h-4 w-4" /> Auftrags-Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "give-order-feedback-open" : "give-order-feedback-closed"} 
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
        </DialogHeader>
        <GiveFeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}