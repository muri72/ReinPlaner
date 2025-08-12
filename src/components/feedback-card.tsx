"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Image as ImageIcon, Trash2, Pencil, CornerDownRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"; // useCarousel entfernt
import NextImage from "next/image";
import { toast } from "sonner";
import { FeedbackReplyForm } from "./feedback-reply-form";
import { deleteOrderFeedback, deleteGeneralFeedback } from "@/app/dashboard/feedback/actions";
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
import { cn } from "@/lib/utils";

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
}

export function FeedbackCard({ feedback, feedbackType, currentUserId, currentUserRole }: FeedbackCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const canEditOrDelete = isManagerOrAdmin || feedback.user_id === currentUserId;
  const titleId = `delete-feedback-alert-title-${feedback.id}`;
  const descriptionId = `delete-feedback-alert-description-${feedback.id}`;

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

  // Carousel-State für Indikatoren
  const [carouselApi, setCarouselApi] = useState<CarouselApi>(); // State für CarouselApi
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    setTotalSlides(carouselApi.scrollSnapList().length);
    setCurrentSlide(carouselApi.selectedScrollSnap());

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);


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
              <Star key={star} className={`h-4 w-4 ${feedback.rating! >= star ? "text-warning fill-warning" : "text-muted-foreground"}`} />
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
            <Carousel
              className="w-full max-w-sm mx-auto relative"
              opts={{
                loop: true, // Optional: Für unendliches Scrollen
              }}
              setApi={setCarouselApi} // API setzen
            >
              <CarouselContent>
                {feedback.image_urls.map((url, index) => (
                  <CarouselItem key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block"> {/* Link zum Öffnen in neuem Tab */}
                      <NextImage src={url} alt={`Feedback-Bild ${index + 1}`} width={200} height={200} className="rounded-md object-cover w-full h-40" />
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {/* Explicit positioning for arrows */}
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-20" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-20" />
              {/* Indikatoren */}
              <CarouselIndicators
                totalSlides={totalSlides}
                currentSlide={currentSlide}
                carouselApi={carouselApi} // carouselApi direkt übergeben
              />
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
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {feedbackType === 'order' ? (
                    <OrderFeedbackEditDialog feedback={feedback} />
                  ) : (
                    <GeneralFeedbackEditDialog feedback={feedback} />
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent 
                      key={`delete-feedback-${feedback.id}-open`} 
                      aria-labelledby={titleId} 
                      aria-describedby={descriptionId}
                      className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
                    >
                      <DialogHeader>
                        <VisuallyHidden asChild>
                          <DialogTitle id={titleId}>Sind Sie sicher?</DialogTitle>
                        </VisuallyHidden>
                        <DialogDescription id={descriptionId}>
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

// Neue Komponente für die Carousel-Indikatoren
interface CarouselIndicatorsProps {
  totalSlides: number;
  currentSlide: number;
  carouselApi: CarouselApi | undefined; // carouselApi als Prop hinzugefügt
}

function CarouselIndicators({ totalSlides, currentSlide, carouselApi }: CarouselIndicatorsProps) {
  return (
    <div className="flex justify-center gap-2 mt-4">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <button
          key={index}
          className={cn(
            "h-2 w-2 rounded-full bg-muted-foreground transition-colors",
            currentSlide === index && "bg-primary"
          )}
          onClick={() => carouselApi?.scrollTo(index)}
          aria-label={`Gehe zu Bild ${index + 1}`}
        />
      ))}
    </div>
  );
}