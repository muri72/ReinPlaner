"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addTicketComment } from "@/app/dashboard/tickets/actions";
import { handleActionResponse } from "@/lib/toast-utils";
import { MessageCircle, UserRound } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

const commentSchema = z.object({
  commentText: z.string().min(1, "Kommentar darf nicht leer sein.").max(1000, "Kommentar ist zu lang."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface Comment {
  user_id: string;
  timestamp: string;
  text: string;
  user_first_name?: string | null;
  user_last_name?: string | null;
}

interface TicketCommentSectionProps {
  ticketId: string;
  comments: Comment[];
  onCommentAdded?: () => void;
}

export function TicketCommentSection({ ticketId, comments, onCommentAdded }: TicketCommentSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  const onSubmit = async (data: CommentFormValues) => {
    setIsSubmitting(true);
    const result = await addTicketComment(ticketId, data.commentText);
    handleActionResponse(result);
    if (result.success) {
      form.reset();
      onCommentAdded?.();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <MessageCircle className="mr-2 h-5 w-5" /> Kommentare
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Kommentare vorhanden.</p>
      ) : (
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {comments.map((comment, index) => (
            <div key={index} className="border-l-2 pl-3 py-1">
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <UserRound className="h-4 w-4 mr-2" />
                <span className="font-medium">{comment.user_first_name || comment.user_last_name ? `${comment.user_first_name || ''} ${comment.user_last_name || ''}`.trim() : 'Unbekannt'}</span>
                <span className="ml-auto text-xs">{format(new Date(comment.timestamp), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
              </div>
              <p className="text-sm text-foreground">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <div>
          <Label htmlFor="commentText">Neuen Kommentar hinzufügen</Label>
          <Textarea
            id="commentText"
            {...form.register("commentText")}
            placeholder="Schreiben Sie Ihren Kommentar hier..."
            rows={3}
          />
          {form.formState.errors.commentText && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.commentText.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kommentar senden..." : "Kommentar senden"}
        </Button>
      </form>
    </div>
  );
}