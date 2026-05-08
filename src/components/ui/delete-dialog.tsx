"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeleteDialogProps {
  /** Custom trigger element (optional - uses icon button if not provided) */
  trigger?: React.ReactNode;
  /** ID of the item to delete */
  itemId: string;
  /** Name shown in tooltip */
  itemName?: string;
  /** The delete action to call - returns a promise with success/error */
  deleteAction: (id: string) => Promise<{ success: boolean; message: string }>;
  /** Callback after successful deletion */
  onDeleteSuccess?: () => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Button variant (default: destructive) */
  variant?: "default" | "destructive";
  /** Button size (default: icon) */
  size?: "default" | "icon" | "sm";
  /** Additional CSS classes */
  className?: string;
}

export function DeleteDialog({
  trigger,
  itemId,
  itemName,
  deleteAction,
  onDeleteSuccess,
  title = "Sind Sie sicher?",
  description = "Diese Aktion kann nicht rückgängig gemacht werden. Die Daten werden dauerhaft gelöscht.",
  variant = "destructive",
  size = "icon",
  className,
}: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    const result = await deleteAction(itemId);

    if (result.success) {
      toast.success(result.message);
      setOpen(false);
      onDeleteSuccess?.();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size={size}
      className={variant === "destructive" ? "text-destructive hover:text-destructive/80" : className}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent
              key={`delete-dialog-${itemId}-open`}
              className="sm:max-w-md max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  variant={variant === "destructive" ? "destructive" : "default"}
                >
                  {loading ? "Löschen..." : "Löschen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TooltipTrigger>
        {itemName && (
          <TooltipContent>
            <p>{itemName} löschen</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
