"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderFormValues } from "../order-form";

interface OrderFinancialsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  services: { id: string; key: string; title: string; default_hourly_rate: number | null }[];
  totalHoursLabel: string;
}

export function OrderFinancialsSection({
  form,
  services,
  totalHoursLabel,
}: OrderFinancialsSectionProps) {
  return (
    <>
      {/* Priority */}
      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select
          onValueChange={(value: OrderFormValues["priority"]) => form.setValue("priority", value)}
          value={form.watch("priority")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Priorität auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Niedrig</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.priority && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.priority.message)}</p>}
      </div>

      {/* Total Estimated Hours */}
      <div>
        <Label htmlFor="totalEstimatedHours">{totalHoursLabel}</Label>
        <Input
          id="totalEstimatedHours"
          type="number"
          step="0.01"
          {...form.register("totalEstimatedHours")}
          placeholder="Wird automatisch berechnet"
          readOnly
          className="bg-muted cursor-not-allowed"
        />
        {form.formState.errors.totalEstimatedHours && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.totalEstimatedHours.message)}</p>}
        {(() => {
          const totalHours = form.watch("totalEstimatedHours") as number | null | undefined;
          const serviceKey = form.watch("serviceKey");
          const markupPercentage = form.watch("markupPercentage") as number | null | undefined;
          const customHourlyRate = form.watch("customHourlyRate") as number | null | undefined;
          const fixedPrice = form.watch("fixedMonthlyPrice") as number | null | undefined;

          if (totalHours && totalHours > 0 && serviceKey && !fixedPrice) {
            const service = services.find(s => s.key === serviceKey);
            const defaultRate = Number(service?.default_hourly_rate || 0);

            let finalRate = Number(customHourlyRate || defaultRate);
            const baseRate = finalRate;
            if (markupPercentage && markupPercentage > 0) {
              finalRate = finalRate * (1 + markupPercentage / 100);
            }

            const total = (totalHours || 0) * finalRate;
            return (
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <div>Zeitaufwand: {totalHours.toFixed(2)} Stunden</div>
                <div>
                  Stundensatz: {finalRate.toFixed(2)} €/h
                  {markupPercentage && markupPercentage > 0 && (
                    <span className="text-muted-foreground"> (inkl. {markupPercentage}% Aufschlag)</span>
                  )}
                  {customHourlyRate && customHourlyRate > 0 && (
                    <span className="text-muted-foreground"> (angepasst)</span>
                  )}
                </div>
                <div className="font-semibold text-foreground">Gesamt: {total.toFixed(2)} €</div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Fixed Monthly Price */}
      <div>
        <Label htmlFor="fixedMonthlyPrice">Pauschaler Preis (€, optional)</Label>
        <Input
          id="fixedMonthlyPrice"
          type="number"
          step="0.01"
          min="0"
          {...form.register("fixedMonthlyPrice")}
          placeholder="z.B. 150.00"
        />
        {form.formState.errors.fixedMonthlyPrice && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.fixedMonthlyPrice.message)}</p>}
        <p className="text-xs text-muted-foreground mt-1">Festpreis für diesen Auftrag (gilt für alle Auftragstypen)</p>
        {(() => {
          const fixedPrice = form.watch("fixedMonthlyPrice") as number | null | undefined;
          if (fixedPrice && fixedPrice > 0) {
            return <p className="text-xs text-green-600 mt-1">✓ Pauschale ausgewählt (Zeitaufwand wird nicht berechnet)</p>;
          }
          return null;
        })()}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche Notizen zum Auftrag..."
          rows={3}
        />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.notes.message)}</p>}
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          onValueChange={(value: OrderFormValues["status"]) => form.setValue("status", value)}
          value={form.watch("status")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="inactive">Inaktiv</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.status.message)}</p>}
      </div>

      {/* Request Status */}
      <div>
        <Label htmlFor="requestStatus">Anfragestatus</Label>
        <Select
          onValueChange={(value: OrderFormValues["requestStatus"]) => form.setValue("requestStatus", value)}
          value={form.watch("requestStatus")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Anfragestatus auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.requestStatus && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.requestStatus.message)}</p>}
      </div>
    </>
  );
}
