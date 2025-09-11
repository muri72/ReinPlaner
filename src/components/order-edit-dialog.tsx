"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderForm, OrderFormValues } from "@/components/order-form";
import { updateOrder } from "@/app/dashboard/orders/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface OrderEditDialogProps {
  order: any;
  onSuccess?: () => void;
}

export function OrderEditDialog({ order, onSuccess }: OrderEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleUpdate = async (data: OrderFormValues) => {
    const result = await updateOrder(order.id, data);
    if (result.success) {
      setIsDirty(false); // Reset dirty state on successful save
      setOpen(false);
      onSuccess?.();
    }
    return result;
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isDirty) {
      setIsConfirmDialogOpen(true);
    } else {
      setOpen(isOpen);
      if (!isOpen) {
        setIsDirty(false); // Reset dirty state if closed without changes
      }
    }
  };

  const handleDiscard = () => {
    setIsDirty(false);
    setIsConfirmDialogOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
              <p>Auftrag bearbeiten</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DialogContent 
          className="sm:max-w-5xl max-h-[90vh] flex flex-col glassmorphism-card"
          onInteractOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
              setIsConfirmDialogOpen(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Auftrag bearbeiten: {order.title}</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Details dieses Auftrags.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4">
            <OrderForm
              initialData={order}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => {
                setIsDirty(false);
                setOpen(false);
                onSuccess?.();
              }}
              onDirtyChange={setIsDirty} // Pass callback to get dirty state
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
            <AlertDialogDescription>
              Sie haben ungespeicherte Änderungen. Möchten Sie diese verwerfen und das Fenster schließen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Verwerfen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}