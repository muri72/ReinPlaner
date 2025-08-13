"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { UserForm, UserFormValues } from "@/components/user-form";
import { registerUser } from "@/app/dashboard/users/actions";
// Removed import: VisuallyHidden

interface UserCreateDialogProps {
  onUserCreated?: () => void;
}

export function UserCreateDialog({ onUserCreated }: UserCreateDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

  const handleCreate = async (data: UserFormValues) => {
    const result = await registerUser(data);
    if (result.success) {
      setOpen(false);
      onUserCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuen Benutzer registrieren
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "user-create-open" : "user-create-closed"} 
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
        </DialogHeader>
        <UserForm
          onSubmit={handleCreate}
          submitButtonText="Benutzer registrieren"
          onSuccess={() => setOpen(false)}
          isEditMode={false}
        />
      </DialogContent>
    </Dialog>
  );
}