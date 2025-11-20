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
import { handleActionResponse } from "@/lib/toast-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { MessageSquareReply } from "lucide-react";
import { useRouter } from "next/navigation";

const replySchema = z.object({
  replyText: z.string().min(1, "Antwort darf nicht leer sein.").max(2000, "Antwort ist zu lang."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface FeedbackReplyFormProps {
  feedbackId: string;
  feedbackType: 'order' | 'general';
  onSuccess?: () => void;
  isInDialog?: boolean;
}

export function FeedbackReplyForm({ feedbackId, feedbackType, onSuccess, isInDialog = false }: FeedbackReplyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const router = useRouter();
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
  });

  const onSubmit = async (data: ReplyFormValues) => {
    setIsSubmitting(true);
    const action = feedbackType === 'order' ? replyToOrderFeedback : replyToGeneralFeedback;
    const result = await action(feedbackId, data.replyText);

    handleActionResponse(result);

    if (result.success) {
      form.reset();
      onSuccess?.();
    }
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title="Antwort verfassen"
            description="Schreiben Sie Ihre Antwort auf das Feedback"
            icon={<MessageSquareReply className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor={`reply-${feedbackId}`}>Ihre Antwort</Label>
              <Textarea
                id={`reply-${feedbackId}`}
                {...form.register("replyText")}
                placeholder="Schreiben Sie eine Antwort..."
                rows={4}
              />
              {form.formState.errors.replyText && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.replyText.message}</p>
              )}
            </div>
          </FormSection>

          <FormActions
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            submitLabel="Antwort senden"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gesendet..."
            align="right"
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            onSuccess?.();
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Antwort-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="feedback-reply-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquareReply className="h-5 w-5 text-primary" />
            Feedback beantworten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Antwort verfassen"
              description="Schreiben Sie Ihre Antwort auf das Feedback"
              icon={<MessageSquareReply className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor={`reply-${feedbackId}`}>Ihre Antwort</Label>
                <Textarea
                  id={`reply-${feedbackId}`}
                  {...form.register("replyText")}
                  placeholder="Schreiben Sie eine Antwort..."
                  rows={4}
                />
                {form.formState.errors.replyText && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.replyText.message}</p>
                )}
              </div>
            </FormSection>

            <FormActions
              isSubmitting={isSubmitting}
              onCancel={handleCancel}
              submitLabel="Antwort senden"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gesendet..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}