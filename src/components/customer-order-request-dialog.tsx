"use client";

import { useState } from "react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
import { CustomerOrderRequestForm } from "@/components/customer-order-request-form";

interface CustomerOrderRequestDialogProps {
  customerId: string;
  onOrderRequested?: () => void;
}

export function CustomerOrderRequestDialog({ customerId, onOrderRequested }: CustomerOrderRequestDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpen}
      title="Neue Buchung anfragen"
      description="Füllen Sie das Formular aus, um eine neue Reinigungsdienstleistung anzufragen."
      icon={<FileText className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      }
    >
      <Button className="w-full" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" /> Neue Buchung anfragen
      </Button>

      <CustomerOrderRequestForm
        customerId={customerId}
        onSuccess={() => {
          setOpen(false);
          onOrderRequested?.();
        }}
      />
    </RecordDialog>
  );
}