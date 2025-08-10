"use client";

import { Star, MessageSquare, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import NextImage from "next/image";

interface Feedback {
  rating: number;
  comment: string | null;
  image_urls: string[] | null;
  created_at: string;
}

interface OrderFeedbackDisplayProps {
  feedback: Feedback;
}

export function OrderFeedbackDisplay({ feedback }: OrderFeedbackDisplayProps) {
  return (
    <Card className="mt-4 bg-secondary/50">
      <CardHeader>
        <CardTitle className="text-md flex items-center">Kundenfeedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                feedback.rating >= star
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
        {feedback.comment && (
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground italic">"{feedback.comment}"</p>
          </div>
        )}
        {feedback.image_urls && feedback.image_urls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              Bilder
            </h4>
            <Carousel className="w-full max-w-xs mx-auto">
              <CarouselContent>
                {feedback.image_urls.map((url, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <NextImage
                          src={url}
                          alt={`Feedback-Bild ${index + 1}`}
                          width={200}
                          height={200}
                          className="rounded-md object-cover w-full h-40"
                        />
                      </a>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}
      </CardContent>
    </Card>
  );
}