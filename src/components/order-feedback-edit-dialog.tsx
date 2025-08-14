"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Star } from "lucide-react"; // Added Star import
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateOrderFeedback } from "@/app/dashboard/feedback/actions";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { handleActionResponse } from "@/lib/toast-utils";

const editSchema = z.object({
  rating: z.number().min(1, "Bewertung ist erforderlich").max(5),
  comment: z.string().max(1000, "Kommentar ist zu lang").optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface OrderFeedbackEditDialogProps {
  feedback: {
    id: string;
    rating: number;
    comment: string | null;
  };
}

export function OrderFeedbackEditDialog({ feedback }: OrderFeedbackEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      rating: feedback.rating || 0,
      comment: feedback.comment || "",
    },
  });
  const rating = form.watch("rating");

  const handleSubmit = async (data: EditFormValues) => {
    const formData = new FormData();
    formData.append("rating", String(data.rating));
    if (data.comment) formData.append("comment", data.comment);

    const result = await updateOrderFeedback(feedback.id, formData);
    handleActionResponse(result);
    if (result.success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Feedback bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "order-feedback-edit-open" : "order-feedback-edit-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Feedback bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten des Auftrags-Feedbacks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label>Bewertung</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer transition-colors ${
                    (hoverRating || rating) >= star ? "text-warning fill-warning" : "text-muted-foreground"
                  }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => form.setValue("rating", star, { shouldValidate: true })}
                />
              ))}
            </div>
            {form.formState.errors.rating && <p className="text-red-500 text-sm mt-1">{form.formState.errors.rating.message}</p>}
          </div>
          <div>
            <Label htmlFor="comment">Kommentar</Label>
            <Textarea id="comment" {...form.register("comment")} />
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}