"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ObjectCreateDialogProps {
  customerId?: string;
  onObjectCreated?: (newObjectId: string) => void;
  disabled?: boolean;
  variant?: "icon" | "button";
}

export function ObjectCreateDialog({ customerId, onObjectCreated, disabled, variant = "icon" }: ObjectCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `object-create-dialog-title`;
  const descriptionId = `object-create-dialog-description`;

  const handleCreate = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    if (result.success) {
      setOpen(false);
      if (result.newObjectId) {
        onObjectCreated?.(result.newObjectId);
      }
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            title={disabled ? "Bitte zuerst einen Kunden auswählen" : "Neues Objekt für diesen Kunden erstellen"}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Neues Objekt erstellen
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mb-1"
            disabled={disabled}
            title={disabled ? "Bitte zuerst einen Kunden auswählen" : "Neues Objekt für diesen Kunden erstellen"}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        key={open ? "object-create-open" : "object-create-closed"}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Neues Objekt erstellen</DialogTitle>
          <DialogDescription id={descriptionId}>
            <VisuallyHidden>Formular zum Erstellen eines neuen Objekts.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <ObjectForm
          initialData={{ customerId: customerId }}
          onSubmit={handleCreate}
          submitButtonText="Objekt hinzufügen"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
