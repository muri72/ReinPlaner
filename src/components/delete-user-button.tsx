"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteUser } from "@/app/dashboard/users/actions";
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
// VisuallyHidden is no longer needed for sr-only

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const titleId = `delete-user-alert-title-${userId}`;
  const descriptionId = `delete-user-alert-description-${userId}`;

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('userId', userId);

    const result = await deleteUser(formData);

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
              key={`delete-user-${userId}-open`} 
              aria-labelledby={titleId} 
              aria-describedby={descriptionId}
              className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                <DialogTitle id={titleId} className="sr-only">Sind Sie sicher?</DialogTitle>
                <DialogDescription id={descriptionId} className="sr-only">
                  Diese Aktion kann nicht rückgängig gemacht werden. Der Benutzer und alle zugehörigen Daten werden dauerhaft gelöscht.
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
          <p>Benutzer löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}