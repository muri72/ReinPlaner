"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react";
import { ManagerCustomerAssignmentForm } from "@/components/manager-customer-assignment-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ManagerCustomerAssignmentDialogProps {
  managerId: string;
  managerName: string;
}

export function ManagerCustomerAssignmentDialog({ managerId, managerName }: ManagerCustomerAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700" title={`Kunden für ${managerName} zuweisen`}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kunden zuweisen</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "manager-assignment-open" : "manager-assignment-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Kunden für {managerName} zuweisen</DialogTitle>
          <DialogDescription>
            Formular zur Zuweisung von Kunden zu einem Manager.
          </DialogDescription>
        </DialogHeader>
        <ManagerCustomerAssignmentForm
          managerId={managerId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}