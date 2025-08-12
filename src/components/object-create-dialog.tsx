"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

interface ObjectCreateDialogProps {
  onObjectCreated?: () => void;
}

export function ObjectCreateDialog({ onObjectCreated }: ObjectCreateDialogProps) {
  const [open, setOpen] = useState(false);

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
      <DialogContent key={open ? "object-create-open" : "object-create-closed"} className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="object-create-dialog-title" aria-describedby="object-create-dialog-description">
        <DialogHeader>
          <DialogTitle id="object-create-dialog-title">Neues Objekt hinzufügen</DialogTitle>
          <DialogDescription id="object-create-dialog-description">
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