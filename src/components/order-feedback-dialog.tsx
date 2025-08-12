"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { OrderFeedbackForm } from "@/components/order-feedback-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface OrderFeedbackDialogProps {
  orderId: string;
}

export function OrderFeedbackDialog({ orderId }: OrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Star className="mr-2 h-4 w-4" /> Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent key={open ? "order-feedback-open" : "order-feedback-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="order-feedback-dialog-title" aria-describedby="order-feedback-dialog-description">
        <DialogHeader>
          <DialogTitle id="order-feedback-dialog-title">Feedback zum Auftrag</DialogTitle>
          <DialogDescription id="order-feedback-dialog-description">
            <VisuallyHidden>Formular zum Einreichen von Feedback zu einem Auftrag.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <OrderFeedbackForm orderId={orderId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}