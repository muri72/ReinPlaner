"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ObjectCreateDialogProps {
  onObjectCreated?: () => void;
}

export function ObjectCreateDialog({ onObjectCreated }: ObjectCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `object-create-dialog-title`;
  const descriptionId = `object-create-dialog-description`;

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
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neues Objekt hinzufügen</DialogTitle>
          <DialogDescription id={descriptionId}>
            <VisuallyHidden>Formular zum Hinzufügen eines neuen Objekts.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <ObjectForm
          onSubmit={handleCreate}
          submitButtonText="Objekt hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}