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
import { createOrder } from "@/app/dashboard/orders/actions"; // Reuse existing action

// Definierte Liste der Dienstleistungen (muss mit order-form.tsx übereinstimmen)
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

export const customerOrderRequestSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  dueDate: z.date().optional().nullable(), // Only for one-time requests
  orderType: z.enum(["one_time", "recurring"]).default("one_time"), // Simplified types for customer
  recurringStartDate: z.date().optional().nullable(), // For recurring requests
  recurringEndDate: z.date().optional().nullable(), // For recurring requests
  serviceType: z.enum(availableServices, { required_error: "Dienstleistung ist erforderlich" }),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
});

export type CustomerOrderRequestFormValues = z.infer<typeof customerOrderRequestSchema>;

interface CustomerOrderRequestFormProps {
  customerId: string; // The customer ID will be passed from the parent
  onSuccess?: () => void;
}

export function CustomerOrderRequestForm({ customerId, onSuccess }: CustomerOrderRequestFormProps) {
  const supabase = createClient();
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);

  const form = useForm<CustomerOrderRequestFormValues>({
    resolver: zodResolver(customerOrderRequestSchema),
    defaultValues: {
      title: "",
      description: null,
      dueDate: null,
      orderType: "one_time",
      recurringStartDate: null,
      recurringEndDate: null,
      serviceType: availableServices[0],
      notes: null,
    },
  });

  const orderType = form.watch("orderType");

  // Fetch objects and customer contacts for the specific customer
  useEffect(() => {
    const fetchRelatedData = async () => {
      if (customerId) {
        const { data: objectsData, error: objectsError } = await supabase
          .from('objects')
          .select('id, name, customer_id')
          .eq('customer_id', customerId)
          .order('name', { ascending: true });
        if (objectsData) setObjects(objectsData);
        if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

        const { data: contactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, customer_id')
          .eq('customer_id', customerId)
          .order('last_name', { ascending: true });
        if (contactsData) setCustomerContacts(contactsData);
        if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
      }
    };
    fetchRelatedData();
  }, [customerId, supabase]);

  const handleFormSubmit: SubmitHandler<CustomerOrderRequestFormValues> = async (data) => {
    // Automatically assign the customerId and set request_status to 'pending'
    const result = await createOrder({
      ...data,
      customerId: customerId,
      objectId: objects.length > 0 ? objects[0].id : null, // objectId ist jetzt optional/nullable
      customerContactId: customerContacts.length > 0 ? customerContacts[0].id : null,
      status: 'pending', // Default status for customer requests
      requestStatus: 'pending', // Always pending for customer requests
      // employeeId: null, // No employee assigned yet // Entfernt
      priority: 'medium', // Default priority for customer requests
      totalEstimatedHours: null, // No estimated hours from customer // Corrected column name
    });

    handleActionResponse(result);
    if (result.success) {
      form.reset();
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
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
          rows={4}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="serviceType">Gewünschte Dienstleistung</Label>
        <Select onValueChange={(value) => form.setValue("serviceType", value as CustomerOrderRequestFormValues["serviceType"])} value={form.watch("serviceType") || ""}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Dienstleistung auswählen" />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
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
          form.setValue("recurringStartDate", null);
          form.setValue("recurringEndDate", null);
        }} value={form.watch("orderType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftragstyp auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">Einmalig</SelectItem>
            <SelectItem value="recurring">Wiederkehrend</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.orderType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
        )}
      </div>

      {orderType === "one_time" && (
        <DatePicker
          label="Gewünschtes Datum (optional)"
          value={form.watch("dueDate")}
          onChange={(date) => form.setValue("dueDate", date)}
          error={form.formState.errors.dueDate?.message}
        />
      )}

      {orderType === "recurring" && (
        <>
          <DatePicker
            label="Gewünschtes Startdatum"
            value={form.watch("recurringStartDate")}
            onChange={(date) => form.setValue("recurringStartDate", date)}
            error={form.formState.errors.recurringStartDate?.message}
          />
          <DatePicker
            label="Gewünschtes Enddatum (optional)"
            value={form.watch("recurringEndDate")}
            onChange={(date) => form.setValue("recurringEndDate", date)}
            error={form.formState.errors.recurringEndDate?.message}
          />
        </>
      )}
      
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
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Anfrage senden..." : "Anfrage senden"}
      </Button>
    </form>
  );
}