"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTicket } from "@/app/dashboard/tickets/actions";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DeleteTicketButtonProps {
  ticketId: string;
  onDeleteSuccess?: () => void;
}

export function DeleteTicketButton({ ticketId, onDeleteSuccess }: DeleteTicketButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('ticketId', ticketId);

    const result = await deleteTicket(formData);

    if (result.success) {
      toast.success(result.message);
      setOpen(false);
      onDeleteSuccess?.();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/80"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent 
              key={`delete-ticket-${ticketId}-open`} 
              className="sm:max-w-md max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                <DialogTitle>Sind Sie sicher?</DialogTitle>
                <DialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Das Ticket wird dauerhaft gelöscht.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleDelete} disabled={loading}>
                  {loading ? "Löschen..." : "Löschen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ticket löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}