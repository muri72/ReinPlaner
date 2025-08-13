"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteOrder } from "@/app/dashboard/orders/actions";
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
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DeleteOrderButtonProps {
  orderId: string;
}

export function DeleteOrderButton({ orderId }: DeleteOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const titleId = `delete-order-alert-title-${orderId}`;
  const descriptionId = `delete-order-alert-description-${orderId}`;

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('orderId', orderId);

    const result = await deleteOrder(formData);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Dialog>
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
              key={`delete-order-${orderId}-open`} 
              aria-labelledby={titleId} 
              aria-describedby={descriptionId}
            >
              <DialogHeader>
                <DialogTitle id={titleId}>
                  <VisuallyHidden>Sind Sie sicher?</VisuallyHidden>
                </DialogTitle>
                <DialogDescription id={descriptionId}>
                  <VisuallyHidden>
                    Diese Aktion kann nicht rückgängig gemacht werden. Der Auftrag und alle zugehörigen Daten werden dauerhaft gelöscht.
                  </VisuallyHidden>
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
          <p>Auftrag löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}