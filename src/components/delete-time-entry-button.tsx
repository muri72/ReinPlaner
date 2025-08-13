"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTimeEntry } from "@/app/dashboard/time-tracking/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Keep DialogClose
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface DeleteTimeEntryButtonProps {
  entryId: string;
}

export function DeleteTimeEntryButton({ entryId }: DeleteTimeEntryButtonProps) {
  const [loading, setLoading] = useState(false);
  const titleId = `delete-time-entry-alert-title-${entryId}`;
  const descriptionId = `delete-time-entry-alert-description-${entryId}`;

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('entryId', entryId);

    const result = await deleteTimeEntry(formData);

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
              key={`delete-time-entry-${entryId}-open`} 
              aria-labelledby={titleId} 
              aria-describedby={descriptionId}
              className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                <VisuallyHidden asChild>
                  <DialogTitle id={titleId}>Sind Sie sicher?</DialogTitle>
                </VisuallyHidden>
                <DialogDescription id={descriptionId}>
                  Diese Aktion kann nicht rückgängig gemacht werden. Der Zeiteintrag wird dauerhaft gelöscht.
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
          <p>Zeiteintrag löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}