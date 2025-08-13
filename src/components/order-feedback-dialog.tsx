"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { OrderFeedbackForm } from "@/components/order-feedback-form";
// Removed import: VisuallyHidden

interface OrderFeedbackDialogProps {
  orderId: string;
}

export function OrderFeedbackDialog({ orderId }: OrderFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Star className="mr-2 h-4 w-4" /> Feedback geben
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "order-feedback-open" : "order-feedback-closed"} 
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
        </DialogHeader>
        <OrderFeedbackForm orderId={orderId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}