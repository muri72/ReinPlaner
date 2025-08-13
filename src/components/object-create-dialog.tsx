"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; // Korrigierter Import
import { PlusCircle } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
// Removed import: VisuallyHidden

interface ObjectCreateDialogProps {
  onObjectCreated?: () => void;
}

export function ObjectCreateDialog({ onObjectCreated }: ObjectCreateDialogProps) {
  const [open, setOpen] = useState(false);
  // Removed titleId and descriptionId

  const handleCreate = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    if (result.success) {
      setOpen(false);
      onObjectCreated?.();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neues Objekt hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "object-create-open" : "object-create-closed"} 
        // Removed aria-labelledby and aria-describedby
        className="sm:max-w-[425px] max-h-[90vh] flex flex-col glassmorphism-card" // Added flex flex-col
      >
        <DialogHeader>
          {/* Removed DialogTitle and DialogDescription */}
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4"> {/* Added flex-grow and overflow-y-auto */}
          <ObjectForm
            onSubmit={handleCreate}
            submitButtonText="Objekt hinzufügen"
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}