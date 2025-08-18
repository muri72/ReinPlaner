"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

export const customerContactSchema = z.object({
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  email: z.string().email("Ungültiges E-Mail-Format").max(100, "E-Mail ist zu lang").optional().nullable(),
  phone: z.string().max(50, "Telefonnummer ist zu lang").optional().nullable(),
  role: z.string().max(100, "Rolle ist zu lang").optional().nullable(),
});

export type CustomerContactFormInput = z.input<typeof customerContactSchema>;
export type CustomerContactFormValues = z.infer<typeof customerContactSchema>;

interface CustomerContactFormProps {
  initialData?: Partial<CustomerContactFormInput>;
  onSubmit: (data: CustomerContactFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function CustomerContactForm({ initialData, onSubmit, submitButtonText, onSuccess }: CustomerContactFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  const resolvedDefaultValues: CustomerContactFormValues = {
    customerId: initialData?.customerId ?? "",
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    email: initialData?.email ?? null,
    phone: initialData?.phone ?? null,
    role: initialData?.role ?? null,
  };

  const form = useForm<CustomerContactFormValues>({
    resolver: zodResolver(customerContactSchema as z.ZodSchema<CustomerContactFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  // Kunden für Dropdown laden
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (data) setCustomers(data);
      if (error) console.error("Fehler beim Laden der Kunden:", error);
    };
    fetchCustomers();
  }, [supabase]);

  const handleFormSubmit: SubmitHandler<CustomerContactFormValues> = async (data) => {
    const result = await onSubmit(data);

    handleActionResponse(result); // Nutze die neue Utility

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
        <Label htmlFor="customerId">Zugehöriger Kunde</Label>
        <Select onValueChange={(value) => form.setValue("customerId", value)} value={form.watch("customerId")} disabled={!!initialData?.customerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Z.B. Anna"
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">Nachname</Label>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Z.B. Meier"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">E-Mail (optional)</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="Z.B. anna.meier@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="phone">Telefon (optional)</Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder="Z.B. +49 123 456789"
        />
        {form.formState.errors.phone && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="role">Rolle (optional)</Label>
        <Input
          id="role"
          {...form.register("role")}
          placeholder="Z.B. Objektleiter, Einkäufer"
        />
        {form.formState.errors.role && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.role.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}