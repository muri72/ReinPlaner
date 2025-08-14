"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Image as ImageIcon, Trash2, Pencil, CornerDownRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import NextImage from "next/image";
import { toast } from "sonner";
import { FeedbackReplyForm } from "./feedback-reply-form";
import { deleteOrderFeedback, deleteGeneralFeedback, resolveOrderFeedback, resolveGeneralFeedback } from "@/app/dashboard/feedback/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { OrderFeedbackEditDialog } from "./order-feedback-edit-dialog";
import { GeneralFeedbackEditDialog } from "./general-feedback-edit-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge"; // Hinzugefügt

// Typdefinitionen, die beide Feedback-Arten abdecken
type OrderFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  rating: number; // Required for order feedback
  comment: string | null; // Can be null
  is_resolved: boolean; // New field
  order: { // Required for order feedback
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
  message: string; // Required for general feedback
  is_resolved: boolean; // New field
};

type Feedback = OrderFeedback | GeneralFeedback;

interface FeedbackCardProps {
  feedback: Feedback;
  feedbackType: 'order' | 'general';
  currentUserId: string;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
}

export function FeedbackCard({ feedback, feedbackType, currentUserId, currentUserRole }: FeedbackCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete dialog
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const canEditOrDelete = isManagerOrAdmin || feedback.user_id === currentUserId;

  const handleDelete = async () => {
    setIsDeleting(true);
    const action = feedbackType === 'order' ? deleteOrderFeedback : deleteGeneralFeedback;
    const result = await action(feedback.id);
    if (result.success) {
      toast.success(result.message);
      setIsDeleteDialogOpen(false); // Close dialog on success
    } else {
      toast.error(result.message);
    }
    setIsDeleting(false);
  };

  const handleResolve = async () => {
    setIsResolving(true);
    const action = feedbackType === 'order' ? resolveOrderFeedback : resolveGeneralFeedback;
    const result = await action(feedback.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsResolving(false);
  };

  return (
    <Card className="flex flex-col h-full shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg">
          {feedbackType === 'order' ? (feedback as OrderFeedback).order.title : (feedback as GeneralFeedback).subject || 'Feedback'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {feedbackType === 'order' ? `Kunde: ${(feedback as OrderFeedback).order.customer_name || 'N/A'}` : `Von: ${(feedback as GeneralFeedback).name || 'N/A'}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Eingegangen am: {new Date(feedback.created_at).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {/* Status Badge */}
        {feedback.is_resolved ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Gelöst
          </Badge>
        ) : (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Offen
          </Badge>
        )}

        {/* Rating */}
        {feedbackType === 'order' && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`h-4 w-4 ${(feedback as OrderFeedback).rating >= star ? "text-warning fill-warning" : "text-muted-foreground"}`} />
            ))}
          </div>
        )}

        {/* Comment/Message */}
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground italic">
            "{feedbackType === 'order' ? (feedback as OrderFeedback).comment : (feedback as GeneralFeedback).message}"
          </p>
        </div>

        {/* Images */}
        {feedback.image_urls && feedback.image_urls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center"><ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />Bilder</h4>
            <Carousel
              className="w-full max-w-sm mx-auto relative"
              opts={{
                loop: true,
              }}
            >
              <CarouselContent>
                {feedback.image_urls.map((url, index) => (
                  <CarouselItem key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <NextImage src={url} alt={`Feedback-Bild ${index + 1}`} width={200} height={200} className="rounded-md object-cover w-full h-40" />
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
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
        {isManagerOrAdmin && !feedback.is_resolved && (
          <Button
            onClick={handleResolve}
            disabled={isResolving}
            variant="outline"
            className="w-full mt-2"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isResolving ? "Wird gelöst..." : "Als gelöst markieren"}
          </Button>
        )}
        {canEditOrDelete && (
          <div className="flex items-center gap-2 self-end mt-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {feedbackType === 'order' ? (
                    <OrderFeedbackEditDialog feedback={feedback as OrderFeedback} />
                  ) : (
                    <GeneralFeedbackEditDialog feedback={feedback as GeneralFeedback} />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>Feedback bearbeiten</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}> {/* Pass open state and setter */}
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent 
                      key={`delete-feedback-${feedback.id}-open`} 
                      className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
                    >
                      <DialogHeader>
                        <DialogTitle>Sind Sie sicher?</DialogTitle>
                        <DialogDescription>
                          Diese Aktion kann nicht rückgängig gemacht werden. Das Feedback wird dauerhaft gelöscht.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Abbrechen</Button>
                        </DialogClose>
                        <Button onClick={handleDelete} disabled={isDeleting}>
                          {isDeleting ? "Löschen..." : "Löschen"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Feedback löschen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}