"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Reply, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

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
    id: string;
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

interface FeedbackDetailTabsProps {
  feedback: Feedback;
  feedbackType: "order" | "general";
  currentUserId: string;
  currentUserRole: "admin" | "manager" | "employee" | "customer" | "platform_admin";
  onUpdate?: () => void;
}

export function FeedbackDetailTabs({
  feedback,
  feedbackType,
  currentUserId,
  currentUserRole,
  onUpdate,
}: FeedbackDetailTabsProps) {
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const isOwner = feedback.user_id === currentUserId;
  const canReply = currentUserRole === "admin" || currentUserRole === "manager";

  const handleReply = async () => {
    if (!reply.trim()) {
      toast.error("Bitte geben Sie eine Antwort ein.");
      return;
    }

    setIsSubmitting(true);
    const tableName = feedbackType === "order" ? "order_feedback" : "general_feedback";

    const { error } = await supabase
      .from(tableName)
      .update({
        reply: reply.trim(),
        replied_at: new Date().toISOString(),
      })
      .eq("id", feedback.id);

    if (error) {
      toast.error("Fehler beim Senden der Antwort: " + error.message);
    } else {
      toast.success("Antwort erfolgreich gesendet");
      setReply("");
      setIsReplying(false);
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    const tableName = feedbackType === "order" ? "order_feedback" : "general_feedback";

    const { error } = await supabase
      .from(tableName)
      .update({ is_resolved: !feedback.is_resolved })
      .eq("id", feedback.id);

    if (error) {
      toast.error("Fehler beim Ändern des Status: " + error.message);
    } else {
      toast.success(feedback.is_resolved ? "Feedback als ungelöst markiert" : "Feedback als gelöst markiert");
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Möchten Sie dieses Feedback wirklich löschen?")) {
      return;
    }

    setIsSubmitting(true);
    const tableName = feedbackType === "order" ? "order_feedback" : "general_feedback";

    const { error } = await supabase.from(tableName).delete().eq("id", feedback.id);

    if (error) {
      toast.error("Fehler beim Löschen: " + error.message);
    } else {
      toast.success("Feedback erfolgreich gelöscht");
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="reply">
          Antworten
          {feedback.reply && <Badge className="ml-2 h-5 w-5 p-0 text-xs">1</Badge>}
        </TabsTrigger>
        <TabsTrigger value="actions">Aktionen</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {feedbackType === "order" ? (
                  <Star className="h-5 w-5 text-yellow-400" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                )}
                <CardTitle>
                  {feedbackType === "order"
                    ? (feedback as OrderFeedback).order.title
                    : (feedback as GeneralFeedback).subject || "Allgemeines Feedback"}
                </CardTitle>
              </div>
              {feedback.is_resolved && (
                <Badge variant="default" className="text-xs">
                  Gelöst
                </Badge>
              )}
            </div>
            <CardDescription>
              Eingereicht am{" "}
              {format(new Date(feedback.created_at), "dd. MMMM yyyy 'um' HH:mm", { locale: de })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback Content */}
            {feedbackType === "order" ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Bewertung:</span>
                  {(feedback as OrderFeedback).rating && renderStars((feedback as OrderFeedback).rating)}
                </div>
                {(feedback as OrderFeedback).comment && (
                  <div>
                    <span className="font-medium">Kommentar:</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {(feedback as OrderFeedback).comment}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Kunde:</span>{" "}
                    {(feedback as OrderFeedback).order.customer_name || "N/A"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mitarbeiter:</span>{" "}
                    {(feedback as OrderFeedback).order.employee_name || "N/A"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auftrag:</span>{" "}
                    {(feedback as OrderFeedback).order.title}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Von:</span> {(feedback as GeneralFeedback).name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">E-Mail:</span>{" "}
                    {(feedback as GeneralFeedback).email || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Nachricht:</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {(feedback as GeneralFeedback).message}
                  </p>
                </div>
              </>
            )}

            {/* Image URLs */}
            {feedback.image_urls && feedback.image_urls.length > 0 && (
              <div>
                <span className="font-medium">Bilder:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedback.image_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      Bild {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reply">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Antwort</CardTitle>
            <CardDescription>
              {feedback.reply
                ? `Beantwortet am ${format(new Date(feedback.replied_at!), "dd.MM.yyyy HH:mm", { locale: de })}`
                : "Noch nicht beantwortet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback.reply ? (
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Reply className="h-4 w-4" />
                  <span>von {feedback.replied_by_name || "Admin"}</span>
                </div>
                <p className="whitespace-pre-wrap">{feedback.reply}</p>
              </div>
            ) : canReply ? (
              <>
                <Textarea
                  placeholder="Ihre Antwort eingeben..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={6}
                />
                <div className="flex space-x-2">
                  <Button onClick={handleReply} disabled={isSubmitting || !reply.trim()}>
                    {isSubmitting ? "Senden..." : "Antwort senden"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsReplying(false);
                      setReply("");
                    }}
                    disabled={isSubmitting}
                  >
                    Abbrechen
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Noch keine Antwort vorhanden.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="actions">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Aktionen</CardTitle>
            <CardDescription>Verwalten Sie dieses Feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(isOwner || canReply) && (
                <Button
                  variant="outline"
                  onClick={handleResolve}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {feedback.is_resolved ? "Als ungelöst markieren" : "Als gelöst markieren"}
                </Button>
              )}
              {(isOwner || canReply) && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}