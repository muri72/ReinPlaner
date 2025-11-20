"use client";

import { useState, useEffect } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, MessageCircle, Image as ImageIcon } from "lucide-react";
import { TicketForm, TicketFormValues } from "@/components/ticket-form";
import { updateTicket } from "@/app/dashboard/tickets/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketCommentSection } from "./ticket-comment-section";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { RecordDialog } from "@/components/ui/record-dialog";

interface TicketEditDialogProps {
  ticket: {
    id: string;
    customer_id: string | null;
    object_id: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_to_user_id: string | null;
    image_urls: string[] | null;
    comments: any[];
  };
  onTicketUpdated?: () => void;
}

export function TicketEditDialog({ ticket, onTicketUpdated }: TicketEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("details");

  const handleUpdate = async (data: TicketFormValues) => {
    const result = await updateTicket(ticket.id, data);
    if (result.success) {
      setOpen(false);
      onTicketUpdated?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Ticket bearbeiten"
      description={`Bearbeiten Sie das Ticket: ${ticket.title}`}
      icon={<MessageCircle className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ticket bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="comments">Kommentare</TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Bilder
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="details" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 h-full">
              <TicketForm
                initialData={{
                  title: ticket.title,
                  description: ticket.description || undefined,
                  status: ticket.status as TicketFormValues["status"],
                  priority: ticket.priority as TicketFormValues["priority"],
                  customerId: ticket.customer_id || undefined,
                  objectId: ticket.object_id || undefined,
                  assignedToUserId: ticket.assigned_to_user_id || undefined,
                }}
                onSubmit={handleUpdate}
                submitButtonText="Änderungen speichern"
                onSuccess={() => setOpen(false)}
                isInDialog={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="comments" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 h-full">
              <TicketCommentSection ticketId={ticket.id} comments={ticket.comments} />
            </div>
          </TabsContent>

          <TabsContent value="images" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 h-full">
              {ticket.image_urls && ticket.image_urls.length > 0 ? (
                <Carousel>
                  <CarouselContent>
                    {ticket.image_urls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-video">
                          <Image
                            src={url}
                            alt={`Ticket image ${index + 1}`}
                            fill
                            className="object-contain rounded-lg"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Bilder vorhanden
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
