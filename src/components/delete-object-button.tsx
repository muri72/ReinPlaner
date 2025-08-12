"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteObject } from "@/app/dashboard/objects/actions";
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

interface DeleteObjectButtonProps {
  objectId: string;
}

export function DeleteObjectButton({ objectId }: DeleteObjectButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('objectId', objectId);

    const result = await deleteObject(formData);

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
            <DialogContent key={`delete-object-${objectId}-open`} aria-labelledby={`delete-object-alert-title-${objectId}`}>
              <DialogHeader>
                <VisuallyHidden asChild>
                  <DialogTitle id={`delete-object-alert-title-${objectId}`}>Sind Sie sicher?</DialogTitle>
                </VisuallyHidden>
                <DialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Das Objekt und alle zugehörigen Daten werden dauerhaft gelöscht.
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
          <p>Objekt löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}