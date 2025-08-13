"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAbsenceRequest } from "@/app/dashboard/absence-requests/actions";
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
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DeleteAbsenceRequestButtonProps {
  requestId: string;
}

export function DeleteAbsenceRequestButton({ requestId }: DeleteAbsenceRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const titleId = `delete-absence-request-alert-title-${requestId}`;
  const descriptionId = `delete-absence-request-alert-description-${requestId}`;

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('requestId', requestId);

    const result = await deleteAbsenceRequest(formData);

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
              key={`delete-absence-request-${requestId}-open`} 
              aria-labelledby={titleId} 
              aria-describedby={descriptionId}
              className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                <DialogTitle id={titleId}>
                  <VisuallyHidden>Sind Sie sicher?</VisuallyHidden>
                </DialogTitle>
                <DialogDescription id={descriptionId}>
                  <VisuallyHidden>
                    Diese Aktion kann nicht rückgängig gemacht werden. Der Abwesenheitsantrag wird dauerhaft gelöscht.
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
          <p>Antrag löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}