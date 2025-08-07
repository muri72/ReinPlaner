"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react";
import { UserAssignmentForm } from "@/components/user-assignment-form";

interface UserAssignmentDialogProps {
  userId: string;
  userName: string;
  initialEmployeeId: string | null;
  initialCustomerId: string | null;
}

export function UserAssignmentDialog({ userId, userName, initialEmployeeId, initialCustomerId }: UserAssignmentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700" title={`Mitarbeiter/Kunde für ${userName} zuweisen`}>
          <LinkIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zuweisung für {userName}</DialogTitle>
        </DialogHeader>
        <UserAssignmentForm
          userId={userId}
          initialEmployeeId={initialEmployeeId}
          initialCustomerId={initialCustomerId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}