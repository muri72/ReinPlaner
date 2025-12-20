"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Star, Reply, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type OrderFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  rating: number;
  comment: string | null;
  is_resolved: boolean;
  order: {
    title: string;
    customer_name: string | null;
    employee_name: string | null;
  };
};

type GeneralFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  name: string;
  email: string | null;
  subject: string | null;
  message: string;
  is_resolved: boolean;
};

type Feedback = OrderFeedback | GeneralFeedback;

interface FeedbackCardProps {
  feedback: Feedback;
  feedbackType: "order" | "general";
  currentUserId: string;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onDeleteSuccess?: () => void;
}

export function FeedbackCard({
  feedback,
  feedbackType,
  currentUserId,
  currentUserRole,
  onDeleteSuccess,
}: FeedbackCardProps) {
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const isOwner = feedback.user_id === currentUserId;
  const canReply = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleReply = async () => {
    if (!reply.trim()) {
      toast.error("Bitte geben Sie eine Antwort ein.");
      return;
    }

    setIsSubmitting(true);
    const tableName = feedbackType === 'order' ? 'order_feedback' : 'general_feedback';

    const { error } = await supabase
      .from(tableName)
      .update({
        reply: reply.trim(),
        replied_at: new Date().toISOString(),
      })
      .eq('id', feedback.id);

    if (error) {
      toast.error("Fehler beim Senden der Antwort: " + error.message);
    } else {
      toast.success("Antwort erfolgreich gesendet");
      setReply("");
      setIsReplying(false);
      onDeleteSuccess?.();
    }
    setIsSubmitting(false);
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    const tableName = feedbackType === 'order' ? 'order_feedback' : 'general_feedback';

    const { error } = await supabase
      .from(tableName)
      .update({ is_resolved: !feedback.is_resolved })
      .eq('id', feedback.id);

    if (error) {
      toast.error("Fehler beim Ändern des Status: " + error.message);
    } else {
      toast.success(feedback.is_resolved ? "Feedback als ungelöst markiert" : "Feedback als gelöst markiert");
      onDeleteSuccess?.();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Möchten Sie dieses Feedback wirklich löschen?")) {
      return;
    }

    setIsSubmitting(true);
    const tableName = feedbackType === 'order' ? 'order_feedback' : 'general_feedback';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', feedback.id);

    if (error) {
      toast.error("Fehler beim Löschen: " + error.message);
    } else {
      toast.success("Feedback erfolgreich gelöscht");
      onDeleteSuccess?.();
    }
    setIsSubmitting(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {feedbackType === 'order' ? (
                <Star className="h-5 w-5 text-yellow-400" />
              ) : (
                <MessageSquare className="h-5 w-5 text-blue-400" />
              )}
              <CardTitle className="text-lg font-semibold">
                {feedbackType === 'order'
                  ? (feedback as OrderFeedback).order.title
                  : (feedback as GeneralFeedback).subject || "Allgemeines Feedback"}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>
                {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
              {feedbackType === 'order' && (feedback as OrderFeedback).rating && (
                <span>•</span>
              )}
              {feedbackType === 'order' && (feedback as OrderFeedback).rating && (
                <span>{(feedback as OrderFeedback).rating}/5</span>
              )}
              {feedback.is_resolved && (
                <>
                  <span>•</span>
                  <Badge variant="default" className="text-xs">Gelöst</Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {(isOwner || canReply) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResolve}
                disabled={isSubmitting}
                className="h-8 w-8"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {(isOwner || canReply) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feedback Content */}
        <div className="space-y-2">
          {feedbackType === 'order' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bewertung:</span>
                {(feedback as OrderFeedback).rating && renderStars((feedback as OrderFeedback).rating)}
              </div>
              {(feedback as OrderFeedback).comment && (
                <div>
                  <span className="text-sm font-medium">Kommentar:</span>
                  <p className="text-sm mt-1">{(feedback as OrderFeedback).comment}</p>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <p>Kunde: {(feedback as OrderFeedback).order.customer_name || 'N/A'}</p>
                <p>Mitarbeiter: {(feedback as OrderFeedback).order.employee_name || 'N/A'}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-sm font-medium">Von:</span>
                <p className="text-sm mt-1">{(feedback as GeneralFeedback).name}</p>
              </div>
              {(feedback as GeneralFeedback).email && (
                <div>
                  <span className="text-sm font-medium">E-Mail:</span>
                  <p className="text-sm mt-1">{(feedback as GeneralFeedback).email}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">Nachricht:</span>
                <p className="text-sm mt-1">{(feedback as GeneralFeedback).message}</p>
              </div>
            </>
          )}
        </div>

        {/* Reply Section */}
        {feedback.reply ? (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Antwort</span>
              <span className="text-xs text-muted-foreground">
                von {feedback.replied_by_name || 'Admin'} am{' '}
                {feedback.replied_at &&
                  format(new Date(feedback.replied_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
            </div>
            <p className="text-sm bg-muted/50 p-3 rounded-md">{feedback.reply}</p>
          </div>
        ) : (
          canReply && !isReplying && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReplying(true)}
              className="w-full"
            >
              <Reply className="mr-2 h-4 w-4" />
              Antworten
            </Button>
          )
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <Textarea
              placeholder="Ihre Antwort eingeben..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReplying(false);
                  setReply("");
                }}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleReply} disabled={isSubmitting}>
                {isSubmitting ? "Senden..." : "Antwort senden"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
