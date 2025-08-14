"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateGeneralFeedback } from "@/app/dashboard/feedback/actions";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

const editSchema = z.object({
  subject: z.string().max(200, "Betreff ist zu lang").optional(),
  message: z.string().min(1, "Nachricht ist erforderlich").max(2000, "Nachricht ist zu lang"),
});

type EditFormValues = z.infer<typeof editSchema>;

interface GeneralFeedbackEditDialogProps {
  feedback: {
    id: string;
    subject?: string | null;
    message?: string;
  };
}

export function GeneralFeedbackEditDialog({ feedback }: GeneralFeedbackEditDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `general-feedback-edit-dialog-title`;
  const descriptionId = `general-feedback-edit-dialog-description`;

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      subject: feedback.subject || "",
      message: feedback.message || "",
    },
  });

  const handleSubmit = async (data: EditFormValues) => {
    const formData = new FormData();
    if (data.subject) formData.append("subject", data.subject);
    formData.append("message", data.message);

    const result = await updateGeneralFeedback(feedback.id, formData);
    handleActionResponse(result); // Nutze die neue Utility
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
        key={open ? "general-feedback-edit-open" : "general-feedback-edit-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Feedback bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten des allgemeinen Feedbacks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="subject">Betreff</Label>
            <Input id="subject" {...form.register("subject")} />
          </div>
          <div>
            <Label htmlFor="message">Nachricht</Label>
            <Textarea id="message" {...form.register("message")} />
            {form.formState.errors.message && <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}