"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { OrderFeedbackForm } from "@/components/order-feedback-form";

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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="order-feedback-dialog-title">
        <DialogHeader>
          <DialogTitle id="order-feedback-dialog-title">Feedback zum Auftrag</DialogTitle>
        </DialogHeader>
        <OrderFeedbackForm orderId={orderId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}