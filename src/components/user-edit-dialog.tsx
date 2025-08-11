"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { UserForm, UserFormValues } from "@/components/user-form";
import { updateUser } from "@/app/dashboard/users/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

interface UserEditDialogProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
}

export function UserEditDialog({ user }: UserEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: UserFormValues) => {
    const result = await updateUser(user.id, data);
    if (result.success) {
      setOpen(false);
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
            <p>Benutzer bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="user-edit-dialog-title">
        <DialogHeader>
          <DialogTitle id="user-edit-dialog-title">Benutzer bearbeiten</DialogTitle>
        </DialogHeader>
        <UserForm
          initialData={{
            email: user.email,
            firstName: user.first_name ?? undefined, // Konvertiert null zu undefined
            lastName: user.last_name ?? undefined,   // Konvertiert null zu undefined
            role: user.role as UserFormValues["role"],
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
          isEditMode={true}
        />
      </DialogContent>
    </Dialog>
  );
}