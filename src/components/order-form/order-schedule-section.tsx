"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { OrderFormValues } from "../order-form";

interface OrderScheduleSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}

export function OrderScheduleSection({
  form,
}: OrderScheduleSectionProps) {
  return (
    <>
      {/* Order Type */}
      <div>
        <Label htmlFor="orderType">Auftragstyp</Label>
        <Select
          onValueChange={(value: OrderFormValues["orderType"]) => {
            form.setValue("orderType", value);
            form.setValue("startDate", null);
            form.setValue("endDate", null);
          }}
          value={form.watch("orderType")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftragstyp auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">Einmalig</SelectItem>
            <SelectItem value="recurring">Wiederkehrend</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.orderType && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.orderType.message)}</p>}
      </div>

      {/* Start Date */}
      <DatePicker
        label="Startdatum"
        value={form.watch("startDate")}
        onChange={(date: Date | null) => form.setValue("startDate", date)}
        error={form.formState.errors.startDate?.message as string | undefined}
      />

      {/* End Date */}
      <div className="space-y-4">
        <DatePicker
          label="Enddatum (optional)"
          value={form.watch("endDate")}
          onChange={(date: Date | null) => {
            form.setValue("endDate", date);
          }}
          error={form.formState.errors.endDate?.message as string | undefined}
        />
        <p className="text-xs text-muted-foreground">
          Wenn das Enddatum überschritten ist, wird der Auftrag automatisch inaktiv.
        </p>
      </div>
    </>
  );
}
