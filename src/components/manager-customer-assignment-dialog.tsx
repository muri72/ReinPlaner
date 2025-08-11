"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react"; // Verwenden Sie Link-Icon für Zuweisungen
import { ManagerCustomerAssignmentForm } from "@/components/manager-customer-assignment-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

interface ManagerCustomerAssignmentDialogProps {
  managerId: string;
  managerName: string;
}

export function ManagerCustomerAssignmentDialog({ managerId, managerName }: ManagerCustomerAssignmentDialogProps) {
  const [open, setOpen] = useState(false);

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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="manager-customer-assignment-dialog-title">
        <DialogHeader>
          <DialogTitle id="manager-customer-assignment-dialog-title">Kunden für {managerName} zuweisen</DialogTitle>
        </DialogHeader>
        <ManagerCustomerAssignmentForm
          managerId={managerId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}