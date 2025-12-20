"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { createOrder } from "@/app/dashboard/orders/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { FileText, Calendar, Settings, ShoppingCart, Repeat, Info } from "lucide-react";
import { useRouter } from "next/navigation";

import { getServices, Service } from "@/app/dashboard/services/actions";

// Schema and types for the form
export const customerOrderRequestSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(255, "Titel ist zu lang"),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  orderType: z.enum(["permanent", "one_time", "recurring", "substitution"], {
    required_error: "Auftragstyp ist erforderlich",
  }),
  startDate: z.date().optional().nullable(),
  recurringEndDate: z.date().optional().nullable(),
  objectId: z.string().uuid("Ungültige Objekt-ID").optional().nullable(),
  contactId: z.string().uuid("Ungültige Kontakt-ID").optional().nullable(),
  serviceType: z.string().optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional().default([]),
  recurringInterval: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CustomerOrderRequestFormInput = z.input<typeof customerOrderRequestSchema>;
export type CustomerOrderRequestFormValues = z.infer<typeof customerOrderRequestSchema>;

interface CustomerOrderRequestFormProps {
  customerId: string;
  onSuccess?: () => void;
  isInDialog?: boolean;
}

export function CustomerOrderRequestForm({ customerId, onSuccess, isInDialog = false }: CustomerOrderRequestFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const form = useForm<CustomerOrderRequestFormInput>({
    resolver: zodResolver(customerOrderRequestSchema),
    defaultValues: {
      title: "",
      description: null,
      dueDate: null,
      orderType: "one_time",
      startDate: null,
      recurringEndDate: null,
      serviceType: "", // Default empty, will be set after fetch if needed
      notes: null,
    },
  });

  // ...

  useEffect(() => {
    const fetchRelatedData = async () => {
      // Fetch services
      const fetchedServices = await getServices();
      setServices(fetchedServices);
      // Set default service if available and not set
      if (fetchedServices.length > 0 && !form.getValues("serviceType")) {
        form.setValue("serviceType", fetchedServices[0].name);
      }

      if (customerId) {
        // ... fetch objects and contacts
      }
    };
    fetchRelatedData();
  }, [customerId, supabase]);


  const handleFormSubmit: SubmitHandler<CustomerOrderRequestFormInput> = async (data) => {
    const result = await createOrder({
      ...(data as CustomerOrderRequestFormValues),
      customerId: customerId,
      objectId: objects.length > 0 ? objects[0].id : null,
      customerContactId: customerContacts.length > 0 ? customerContacts[0].id : null,
      status: 'pending',
      requestStatus: 'pending',
      priority: 'medium',
      totalEstimatedHours: null,
    });

    handleActionResponse(result);
    if (result.success) {
      form.reset();
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6" suppressHydrationWarning>
          <FormSection
            title="Anfragedetails"
            description="Grundlegende Informationen zur Bestellanfrage"
            icon={<FileText className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="title">Titel der Anfrage</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Z.B. Büroreinigung für KW 30"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Details zur gewünschten Reinigung..."
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Dienstleistung"
            description="Wählen Sie die gewünschte Dienstleistung aus"
            icon={<Settings className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="serviceType">Gewünschte Dienstleistung</Label>
              <Select onValueChange={(value) => form.setValue("serviceType", value)} value={form.watch("serviceType") || ""}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Dienstleistung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.serviceType && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="orderType">Auftragstyp</Label>
              <Select onValueChange={(value) => {
                form.setValue("orderType", value as CustomerOrderRequestFormValues["orderType"]);
                form.setValue("dueDate", null);
                form.setValue("startDate", null);
                form.setValue("recurringEndDate", null);
              }} value={form.watch("orderType")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auftragstyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Einmalig
                    </div>
                  </SelectItem>
                  <SelectItem value="recurring">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Wiederkehrend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.orderType && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Zeitplan"
            description="Gewünschte Termine für die Dienstleistung"
            icon={<Calendar className="h-5 w-5 text-primary" />}
          >
            {form.watch("orderType") === "one_time" && (
              <DatePicker
                label="Gewünschtes Datum (optional)"
                value={form.watch("dueDate")}
                onChange={(date) => form.setValue("dueDate", date)}
                error={form.formState.errors.dueDate?.message}
              />
            )}

            {form.watch("orderType") === "recurring" && (
              <>
                <DatePicker
                  label="Gewünschtes Startdatum"
                  value={form.watch("startDate")}
                  onChange={(date) => form.setValue("startDate", date)}
                  error={form.formState.errors.startDate?.message}
                />
                <DatePicker
                  label="Gewünschtes Enddatum (optional)"
                  value={form.watch("recurringEndDate")}
                  onChange={(date) => form.setValue("recurringEndDate", date)}
                  error={form.formState.errors.recurringEndDate?.message}
                />
              </>
            )}
          </FormSection>

          <FormSection
            title="Zusätzliche Informationen"
            description="Weitere Details oder besondere Wünsche"
            icon={<Info className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="notes">Zusätzliche Notizen (optional)</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Besondere Anweisungen oder Wünsche..."
                rows={3}
              />
              {form.formState.errors.notes && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
              )}
            </div>
          </FormSection>

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            submitLabel="Anfrage senden"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gesendet..."
            align="right"
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            onSuccess?.();
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie die Bestellanfrage jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="customer-order-request-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Bestellanfrage erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6" suppressHydrationWarning>
            <FormSection
              title="Anfragedetails"
              description="Grundlegende Informationen zur Bestellanfrage"
              icon={<FileText className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="title">Titel der Anfrage</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Z.B. Büroreinigung für KW 30"
                />
                {form.formState.errors.title && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Details zur gewünschten Reinigung..."
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Dienstleistung"
              description="Wählen Sie die gewünschte Dienstleistung aus"
              icon={<Settings className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="serviceType">Gewünschte Dienstleistung</Label>
                <Select onValueChange={(value) => form.setValue("serviceType", value)} value={form.watch("serviceType") || ""}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Dienstleistung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.serviceType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="orderType">Auftragstyp</Label>
                <Select onValueChange={(value) => {
                  form.setValue("orderType", value as CustomerOrderRequestFormValues["orderType"]);
                  form.setValue("dueDate", null);
                  form.setValue("startDate", null);
                  form.setValue("recurringEndDate", null);
                }} value={form.watch("orderType")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auftragstyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Einmalig
                      </div>
                    </SelectItem>
                    <SelectItem value="recurring">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Wiederkehrend
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.orderType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Zeitplan"
              description="Gewünschte Termine für die Dienstleistung"
              icon={<Calendar className="h-5 w-5 text-primary" />}
            >
              {form.watch("orderType") === "one_time" && (
                <DatePicker
                  label="Gewünschtes Datum (optional)"
                  value={form.watch("dueDate")}
                  onChange={(date) => form.setValue("dueDate", date)}
                  error={form.formState.errors.dueDate?.message}
                />
              )}

              {form.watch("orderType") === "recurring" && (
                <>
                  <DatePicker
                    label="Gewünschtes Startdatum"
                    value={form.watch("startDate")}
                    onChange={(date) => form.setValue("startDate", date)}
                    error={form.formState.errors.startDate?.message}
                  />
                  <DatePicker
                    label="Gewünschtes Enddatum (optional)"
                    value={form.watch("recurringEndDate")}
                    onChange={(date) => form.setValue("recurringEndDate", date)}
                    error={form.formState.errors.recurringEndDate?.message}
                  />
                </>
              )}
            </FormSection>

            <FormSection
              title="Zusätzliche Informationen"
              description="Weitere Details oder besondere Wünsche"
              icon={<Info className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="notes">Zusätzliche Notizen (optional)</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Besondere Anweisungen oder Wünsche..."
                  rows={3}
                />
                {form.formState.errors.notes && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
                )}
              </div>
            </FormSection>

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={handleCancel}
              submitLabel="Anfrage senden"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gesendet..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}