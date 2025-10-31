"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // Korrigierter Import
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

// Define the schema for customer form values
export const customerSchema = z.object({
  name: z.string().min(1, "Kundenname ist erforderlich").max(100, "Kundenname ist zu lang"),
  address: z.string().max(255, "Adresse ist zu lang").optional().nullable(),
  contactEmail: z.string().email("Ungültiges E-Mail-Format").max(100, "E-Mail ist zu lang").optional().nullable(),
  contactPhone: z.string().max(50, "Telefonnummer ist zu lang").optional().nullable(),
  customerType: z.enum(["customer", "partner"]).default("customer"),
  contractualServices: z.string().max(1000, "Vertragsdaten sind zu lang").optional().nullable(), // Neues Feld
});

export type CustomerFormInput = z.input<typeof customerSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormInput>;
  onSubmit: (data: CustomerFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function CustomerForm({ initialData, onSubmit, submitButtonText, onSuccess }: CustomerFormProps) {
  const supabase = createClient();

  const resolvedDefaultValues: CustomerFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? null,
    contactEmail: initialData?.contactEmail ?? null,
    contactPhone: initialData?.contactPhone ?? null,
    customerType: initialData?.customerType ?? "customer",
    contractualServices: initialData?.contractualServices ?? null, // Initialwert für neues Feld
  };

  const form = useForm<CustomerFormInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: resolvedDefaultValues,
  });

  const handleFormSubmit: SubmitHandler<CustomerFormInput> = async (data) => {
    const result = await onSubmit(data as CustomerFormValues);

    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md mx-auto">
      <div>
        <Label htmlFor="name">Kundenname</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Z.B. Muster GmbH"
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Z.B. Musterstraße 1, 12345 Musterstadt"
          rows={3}
        />
        {form.formState.errors.address && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contactEmail">Kontakt-E-Mail</Label>
        <Input
          id="contactEmail"
          type="email"
          {...form.register("contactEmail")}
          placeholder="Z.B. kontakt@muster.de"
        />
        {form.formState.errors.contactEmail && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.contactEmail.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contactPhone">Kontakt-Telefon</Label>
        <Input
          id="contactPhone"
          type="tel"
          {...form.register("contactPhone")}
          placeholder="Z.B. +49 123 456789"
        />
        {form.formState.errors.contactPhone && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.contactPhone.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="customerType">Kundentyp</Label>
        <Select onValueChange={(value) => form.setValue("customerType", value as "customer" | "partner")} value={form.watch("customerType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Kunde</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.customerType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerType.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contractualServices">Vertragsdaten (optional)</Label>
        <Textarea
          id="contractualServices"
          {...form.register("contractualServices")}
          placeholder="Z.B. Details zu Reinigungsintervallen, Sonderleistungen, Kündigungsfristen..."
          rows={5}
        />
        {form.formState.errors.contractualServices && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.contractualServices.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}