"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, MessageCircle, Image as ImageIcon } from "lucide-react";
import { TicketForm, TicketFormValues } from "@/components/ticket-form";
import { updateTicket } from "@/app/dashboard/tickets/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketCommentSection } from "./ticket-comment-section";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";

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
    comments: any[]; // Array of comment objects
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
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent 
        key={open ? "ticket-edit-open" : "ticket-edit-closed"} 
        className="sm:max-w-3xl max-h-[90vh] flex flex-col glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Ticket bearbeiten: {ticket.title}</DialogTitle>
          <DialogDescription>
            Verwalten Sie die Details, den Status und die Kommentare des Tickets.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Kommentare</TabsTrigger>
            <TabsTrigger value="attachments">Anhänge</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-grow overflow-y-auto pr-4">
            <TicketForm
              initialData={{
                customerId: ticket.customer_id,
                objectId: ticket.object_id,
                title: ticket.title,
                description: ticket.description,
                status: ticket.status as TicketFormValues["status"],
                priority: ticket.priority as TicketFormValues["priority"],
                assignedToUserId: ticket.assigned_to_user_id,
                imageUrls: ticket.image_urls || [],
              }}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => setOpen(false)}
              isEditMode={true}
            />
          </TabsContent>
          <TabsContent value="comments" className="flex-grow overflow-y-auto pr-4">
            <TicketCommentSection
              ticketId={ticket.id}
              comments={ticket.comments}
              onCommentAdded={onTicketUpdated}
            />
          </TabsContent>
          <TabsContent value="attachments" className="flex-grow overflow-y-auto pr-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <ImageIcon className="mr-2 h-5 w-5" /> Anhänge
            </h3>
            {ticket.image_urls && ticket.image_urls.length > 0 ? (
              <Carousel
                className="w-full max-w-sm mx-auto relative"
                opts={{
                  loop: true,
                }}
              >
                <CarouselContent>
                  {ticket.image_urls.map((url, index) => (
                    <CarouselItem key={index}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <Image src={url} alt={`Ticket-Anhang ${index + 1}`} width={300} height={200} className="rounded-md object-cover w-full h-40" />
                      </a>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Anhänge vorhanden.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}