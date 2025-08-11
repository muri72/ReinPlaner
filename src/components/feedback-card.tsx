"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Image as ImageIcon, User, Briefcase, Building, Mail, Trash2, Pencil, CornerDownRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import NextImage from "next/image";
import { toast } from "sonner";
import { FeedbackReplyForm } from "./feedback-reply-form";
import { deleteOrderFeedback, deleteGeneralFeedback } from "@/app/dashboard/feedback/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Typdefinitionen, die beide Feedback-Arten abdecken
type Feedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  // Order-specific
  rating?: number;
  comment?: string | null;
  order?: {
    title: string;
    customer_name: string | null;
    employee_name: string | null;
  };
  // General-specific
  name?: string;
  email?: string | null;
  subject?: string | null;
  message?: string;
};

interface FeedbackCardProps {
  feedback: Feedback;
  feedbackType: 'order' | 'general';
  currentUserId: string;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onEdit: () => void;
}

export function FeedbackCard({ feedback, feedbackType, currentUserId, currentUserRole, onEdit }: FeedbackCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const canEditOrDelete = isManagerOrAdmin || feedback.user_id === currentUserId;

  const handleDelete = async () => {
    setIsDeleting(true);
    const action = feedbackType === 'order' ? deleteOrderFeedback : deleteGeneralFeedback;
    const result = await action(feedback.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsDeleting(false);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg">{feedback.order?.title || feedback.subject || 'Feedback'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {feedbackType === 'order' ? `Kunde: ${feedback.order?.customer_name || 'N/A'}` : `Von: ${feedback.name || 'N/A'}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Eingegangen am: {new Date(feedback.created_at).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {/* Rating */}
        {feedback.rating !== undefined && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`h-5 w-5 ${feedback.rating! >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
            ))}
          </div>
        )}

        {/* Comment/Message */}
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground italic">"{feedback.comment || feedback.message}"</p>
        </div>

        {/* Images */}
        {feedback.image_urls && feedback.image_urls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center"><ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />Bilder</h4>
            <Carousel className="w-full max-w-xs mx-auto">
              <CarouselContent>
                {feedback.image_urls.map((url, index) => (
                  <CarouselItem key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <NextImage src={url} alt={`Feedback-Bild ${index + 1}`} width={200} height={200} className="rounded-md object-cover w-full h-40" />
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious /><CarouselNext />
            </Carousel>
          </div>
        )}

        {/* Reply Section */}
        {feedback.reply && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold mb-2 flex items-center"><CornerDownRight className="h-4 w-4 mr-2 text-muted-foreground" />Antwort</h4>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-foreground italic">"{feedback.reply}"</p>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                - {feedback.replied_by_name || 'Admin'} am {new Date(feedback.replied_at!).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        {isManagerOrAdmin && !feedback.reply && (
          <FeedbackReplyForm feedbackId={feedback.id} feedbackType={feedbackType} />
        )}
        {canEditOrDelete && (
          <div className="flex items-center gap-2 self-end mt-2">
            <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                  <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden. Das Feedback wird dauerhaft gelöscht.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Löschen..." : "Löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}