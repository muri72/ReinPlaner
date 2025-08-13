"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteEmployee } from "@/app/dashboard/employees/actions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Removed import: VisuallyHidden

interface DeleteEmployeeButtonProps {
  employeeId: string;
}

export function DeleteEmployeeButton({ employeeId }: DeleteEmployeeButtonProps) {
  const [loading, setLoading] = useState(false);
  // Removed titleId and descriptionId

  const handleDelete = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('employeeId', employeeId);

    const result = await deleteEmployee(formData);

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
              key={`delete-employee-${employeeId}-open`} 
              // Removed aria-labelledby and aria-describedby
              className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
            >
              <DialogHeader>
                {/* Removed DialogTitle and DialogDescription */}
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
          <p>Mitarbeiter löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}