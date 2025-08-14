"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { OrderFeedbackForm } from "@/components/order-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface OrderFeedbackDialogProps {
  orderId: string;
}

export function OrderFeedbackDialog({ orderId }: OrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `order-feedback-dialog-title`;
  const descriptionId = `order-feedback-dialog-description`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Star className="mr-2 h-4 w-4" /> Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "order-feedback-open" : "order-feedback-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Feedback zum Auftrag</DialogTitle>
          <DialogDescription id={descriptionId}>
            Formular zum Einreichen von Feedback zu einem Auftrag.
          </DialogDescription>
        </DialogHeader>
        <OrderFeedbackForm orderId={orderId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}