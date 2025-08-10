"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createServiceRequest } from "../app/portal/requests/actions";

const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

const requestSchema = z.object({
  serviceType: z.enum(availableServices, { required_error: "Bitte wählen Sie eine Dienstleistung aus." }),
  objectId: z.string().uuid("Bitte wählen Sie ein Objekt aus."),
  description: z.string().min(10, "Bitte beschreiben Sie Ihr Anliegen etwas genauer.").max(1000),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface ServiceRequestFormProps {
  objects: { id: string; name: string }[];
  customerContactId: string | null;
  customerId: string | null;
}

export function ServiceRequestForm({ objects, customerContactId, customerId }: ServiceRequestFormProps) {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });

  const handleFormSubmit: SubmitHandler<RequestFormValues> = async (data) => {
    if (!customerId) {
      toast.error("Kunden-ID nicht gefunden. Bitte erneut anmelden.");
      return;
    }

    const formData = new FormData();
    formData.append("serviceType", data.serviceType);
    formData.append("objectId", data.objectId);
    formData.append("description", data.description);
    formData.append("customerId", customerId);
    if (customerContactId) {
      formData.append("customerContactId", customerContactId);
    }

    const result = await createServiceRequest(formData);

    if (result.success) {
      toast.success(result.message);
      form.reset();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="serviceType">Welche Dienstleistung benötigen Sie?</Label>
        <Select onValueChange={(value) => form.setValue("serviceType", value as any)} value={form.watch("serviceType")}>
          <SelectTrigger><SelectValue placeholder="Dienstleistung auswählen" /></SelectTrigger>
          <SelectContent>
            {availableServices.map(service => <SelectItem key={service} value={service}>{service}</SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.serviceType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>}
      </div>
      <div>
        <Label htmlFor="objectId">Für welches Ihrer Objekte?</Label>
        <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId")}>
          <SelectTrigger><SelectValue placeholder="Objekt auswählen" /></SelectTrigger>
          <SelectContent>
            {objects.map(obj => <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.objectId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Beschreiben Sie Ihr Anliegen</Label>
        <Textarea id="description" {...form.register("description")} placeholder="Bitte geben Sie hier Details an, z.B. 'Fenster im 2. OG straßenseitig' oder 'Grundreinigung des Teppichs im Eingangsbereich'." rows={5} />
        {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Anfrage wird gesendet..." : "Service-Anfrage senden"}
      </Button>
    </form>
  );
}