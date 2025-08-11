"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createServiceRequest } from "@/app/portal/requests/actions";
import { useRouter } from "next/navigation";

const serviceRequestSchema = z.object({
  serviceType: z.string().min(1, "Dienstleistung ist erforderlich"),
  objectId: z.string().uuid("Objekt ist erforderlich"),
  description: z.string().max(1000, "Beschreibung ist zu lang").optional(),
});

type ServiceRequestFormValues = z.infer<typeof serviceRequestSchema>;

interface ServiceRequestFormProps {
  objects: { id: string; name: string }[];
  customerId: string;
  customerContactId: string | null;
}

export function ServiceRequestForm({ objects, customerId, customerContactId }: ServiceRequestFormProps) {
  const router = useRouter();
  const form = useForm<ServiceRequestFormValues>({
    resolver: zodResolver(serviceRequestSchema),
  });

  const onSubmit = async (data: ServiceRequestFormValues) => {
    const formData = new FormData();
    formData.append('serviceType', data.serviceType);
    formData.append('objectId', data.objectId);
    if (data.description) formData.append('description', data.description);
    formData.append('customerId', customerId);
    if (customerContactId) formData.append('customerContactId', customerContactId);

    const result = await createServiceRequest(formData);

    if (result.success) {
      toast.success(result.message);
      form.reset();
      router.push('/portal/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const availableServices = [
    "Unterhaltsreinigung",
    "Glasreinigung",
    "Grundreinigung",
    "Graffitientfernung",
    "Sonderreinigung",
    "Sonstiges"
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="serviceType">Art der Dienstleistung</Label>
        <Select onValueChange={(value) => form.setValue("serviceType", value)} value={form.watch("serviceType")}>
          <SelectTrigger><SelectValue placeholder="Dienstleistung auswählen" /></SelectTrigger>
          <SelectContent>
            {availableServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.serviceType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>}
      </div>

      <div>
        <Label htmlFor="objectId">Zugehöriges Objekt</Label>
        <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId")}>
          <SelectTrigger><SelectValue placeholder="Objekt auswählen" /></SelectTrigger>
          <SelectContent>
            {objects.map(obj => (
              <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.objectId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Beschreibung des Anliegens (optional)</Label>
        <Textarea id="description" {...form.register("description")} placeholder="Beschreiben Sie Ihr Anliegen hier..." rows={5} />
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Senden..." : "Anfrage senden"}
      </Button>
    </form>
  );
}