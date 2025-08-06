"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { updateObject } from "@/app/dashboard/objects/actions";

interface ObjectEditDialogProps {
  object: {
    id: string;
    name: string;
    address: string;
    description: string | null;
    customer_id: string;
  };
}

export function ObjectEditDialog({ object }: ObjectEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: ObjectFormValues) => {
    const result = await updateObject(object.id, data);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Objekt bearbeiten</DialogTitle>
        </DialogHeader>
        <ObjectForm
          initialData={{
            name: object.name,
            address: object.address,
            description: object.description,
            customerId: object.customer_id,
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}