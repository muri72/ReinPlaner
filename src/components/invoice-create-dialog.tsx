"use client";

import { useState, type ReactNode } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle } from "lucide-react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { NewInvoiceForm } from "@/components/new-invoice-form";
import { Debtor } from "@/lib/invoicing/types";

interface OrderOption {
  id: string;
  title: string;
  customer_name: string;
  order_type: string;
  fixed_monthly_price: number | null;
}

interface InvoiceCreateDialogProps {
  debtors: Debtor[];
  orders: OrderOption[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onInvoiceCreated?: (invoiceId: string) => void;
}

export function InvoiceCreateDialog({
  debtors,
  orders,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  onInvoiceCreated,
}: InvoiceCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpenState = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={setOpenState}
      title="Neue Rechnung erstellen"
      description="Erstellen Sie eine neue Rechnung für einen Debitor."
      icon={<FileText className="h-5 w-5 text-primary" />}
      size="lg"
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Neue Rechnung erstellen
            </Button>
          )}
        </DialogTrigger>
      )}

      <NewInvoiceForm debtors={debtors} orders={orders} />
    </RecordDialog>
  );
}
