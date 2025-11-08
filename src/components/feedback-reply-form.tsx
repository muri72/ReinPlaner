"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { replyToOrderFeedback, replyToGeneralFeedback } from "@/app/dashboard/feedback/actions";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

const replySchema = z.object({
  replyText: z.string().min(1, "Antwort darf nicht leer sein.").max(2000, "Antwort ist zu lang."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface FeedbackReplyFormProps {
  feedbackId: string;
  feedbackType: 'order' | 'general';
  onSuccess?: () => void;
}

export function FeedbackReplyForm({ feedbackId, feedbackType, onSuccess }: FeedbackReplyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
  });

  const onSubmit = async (data: ReplyFormValues) => {
    setIsSubmitting(true);
    const action = feedbackType === 'order' ? replyToOrderFeedback : replyToGeneralFeedback;
    const result = await action(feedbackId, data.replyText);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      form.reset();
      onSuccess?.();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
      <div>
        <Label htmlFor={`reply-${feedbackId}`}>Ihre Antwort</Label>
        <Textarea
          id={`reply-${feedbackId}`}
          {...form.register("replyText")}
          placeholder="Schreiben Sie eine Antwort..."
          rows={3}
        />
        {form.formState.errors.replyText && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.replyText.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Senden..." : "Antwort senden"}
      </Button>
    </form>
  );
}