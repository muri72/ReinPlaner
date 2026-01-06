"use client";

import { useForm, SubmitHandler, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils";
import { FormSection } from "@/components/ui/form-section";
import { FormInputField, FormTextareaField } from "@/components/ui/form-field";
import { FormActions } from "@/components/ui/form-actions";
import { Card, CardContent } from "@/components/ui/card";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { useRouter } from "next/navigation";
import { Building2, Mail, Phone, MapPin, FileText, Users } from "lucide-react";

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
  isInDialog?: boolean;
  title?: string;
  description?: string;
}

export function CustomerForm({ initialData, onSubmit, submitButtonText, onSuccess, isInDialog = false, title, description }: CustomerFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

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

  // Register with unsaved changes context
  useFormUnsavedChanges("customer-form", form.formState.isDirty);

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

  // Wrapper function to call handleFormSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  return (
    <>
      {!isInDialog && (title || description) && (
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <UnsavedChangesProtection formId="customer-form">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 w-full">
          {/* Basic Information Section */}
          <FormSection
            title="Grundinformationen"
            description="Stammdaten des Kunden oder Partners"
            icon={<Building2 className="h-5 w-5" />}
          >
            <FormInputField
              name="name"
              label="Kundenname"
              placeholder="Z.B. Muster GmbH"
              required
              control={form.control}
              description="Offizieller Name des Unternehmens"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInputField
                name="contactEmail"
                label="Kontakt-E-Mail"
                type="email"
                placeholder="Z.B. kontakt@muster.de"
                control={form.control}
                description="E-Mail-Adresse für die Kommunikation"
              />

              <FormInputField
                name="contactPhone"
                label="Kontakt-Telefon"
                type="tel"
                placeholder="Z.B. +49 123 456789"
                control={form.control}
                description="Telefonnummer für die Kommunikation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium after:content-['*'] after:ml-0.5 after:text-destructive">
                Kundentyp
              </label>
              <Select
                onValueChange={(value) => form.setValue("customerType", value as "customer" | "partner")}
                value={form.watch("customerType")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Kunde</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Klassifizierung des Kunden
              </p>
              {form.formState.errors.customerType && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.customerType.message}
                </p>
              )}
            </div>
          </FormSection>

          {/* Address Section */}
          <FormSection
            title="Adresse"
            description="Anschrift des Kunden"
            icon={<MapPin className="h-5 w-5" />}
          >
            <FormTextareaField
              name="address"
              label="Vollständige Adresse"
              placeholder="Z.B. Musterstraße 1, 12345 Musterstadt"
              rows={3}
              control={form.control}
              description="Vollständige postalische Adresse"
            />
          </FormSection>

          {/* Contract Information Section */}
          <FormSection
            title="Vertragsinformationen"
            description="Details zu vertraglichen Vereinbarungen"
            icon={<FileText className="h-5 w-5" />}
          >
            <FormTextareaField
              name="contractualServices"
              label="Vertragsdaten (optional)"
              placeholder="Z.B. Details zu Reinigungsintervallen, Sonderleistungen, Kündigungsfristen..."
              rows={5}
              control={form.control}
              description="Zusätzliche vertragliche Informationen und Konditionen"
            />
          </FormSection>

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel={submitButtonText}
            cancelLabel="Abbrechen"
            showCancel={!isInDialog}
            submitVariant="default"
            loadingText={`${submitButtonText}...`}
          />
        </form>
      </UnsavedChangesProtection>

      <UnsavedChangesAlert
        open={showUnsavedDialog}
        onConfirm={() => {
          setShowUnsavedDialog(false);
          onSuccess?.();
        }}
        onCancel={() => setShowUnsavedDialog(false)}
        title="Ungespeicherte Änderungen verwerfen?"
        description="Wenn Sie das Kunden-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
      />
    </>
  );
}