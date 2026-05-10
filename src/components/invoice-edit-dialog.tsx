"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Pencil } from "lucide-react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { updateInvoiceAction } from "@/lib/invoicing/actions";
import { Invoice, InvoiceStatus } from "@/lib/invoicing/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InvoiceEditDialogProps {
  invoice: Invoice;
  trigger?: ReactNode;
}

export function InvoiceEditDialog({ invoice, trigger }: InvoiceEditDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateInvoiceAction(invoice.id, {
      issue_date: formData.get("issue_date") as string,
      due_date: formData.get("due_date") as string,
      tax_rate: formData.get("tax_rate") ? parseFloat(formData.get("tax_rate") as string) : undefined,
      notes: (formData.get("notes") as string) || undefined,
      reference_text: (formData.get("reference_text") as string) || undefined,
      status: formData.get("status") as InvoiceStatus,
    });

    if (result.success) {
      toast.success("Rechnung wurde aktualisiert!");
      setOpenState(false);
      router.refresh();
    } else {
      toast.error(result.message || "Fehler beim Aktualisieren der Rechnung.");
    }
    setIsSubmitting(false);
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Rechnung bearbeiten"
      description="Bearbeiten Sie die Rechnungsdetails."
      icon={<FileText className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setOpenState(false)}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Wird gespeichert..." : "Änderungen speichern"}
          </Button>
        </div>
      }
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechnungsdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Rechnungsdatum</Label>
                <Input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  defaultValue={invoice.issue_date}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Fälligkeitsdatum</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={invoice.due_date}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">MwSt-Satz (%)</Label>
                <Input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={invoice.tax_rate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={invoice.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="sent">Versendet</SelectItem>
                    <SelectItem value="paid">Bezahlt</SelectItem>
                    <SelectItem value="partial">Teilweise bezahlt</SelectItem>
                    <SelectItem value="cancelled">Storniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_text">Referenz / Bestellnummer</Label>
              <Input
                id="reference_text"
                name="reference_text"
                defaultValue={invoice.reference_text || ""}
                placeholder="Ihre Referenz..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Anmerkungen</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={invoice.notes || ""}
                placeholder="Zusätzliche Hinweise für diese Rechnung..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        </form>
    </RecordDialog>
  );
}
