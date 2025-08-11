"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getServiceRates, updateServiceRates } from "@/app/dashboard/finances/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const serviceRateSchema = z.object({
  rates: z.array(z.object({
    service_type: z.string().min(1, "Dienstleistungstyp darf nicht leer sein."),
    hourly_rate: z.coerce.number().min(0, "Stundensatz muss positiv sein."),
  })),
});

type ServiceRateFormValues = z.infer<typeof serviceRateSchema>;

export function ServiceRateManager() {
  const [loading, setLoading] = useState(true);
  const form = useForm<ServiceRateFormValues>({
    resolver: zodResolver(serviceRateSchema),
    defaultValues: { rates: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rates",
  });

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      const result = await getServiceRates();
      if (result.success && result.data) {
        form.reset({ rates: result.data });
      } else {
        toast.error("Fehler beim Laden der Stundensätze.");
      }
      setLoading(false);
    };
    fetchRates();
  }, [form]);

  const onSubmit = async (data: ServiceRateFormValues) => {
    const result = await updateServiceRates(data.rates);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          <div className="flex-grow">
            <Label htmlFor={`rates.${index}.service_type`}>Dienstleistung</Label>
            <Input
              id={`rates.${index}.service_type`}
              {...form.register(`rates.${index}.service_type`)}
              placeholder="z.B. Glasreinigung"
            />
          </div>
          <div className="w-32">
            <Label htmlFor={`rates.${index}.hourly_rate`}>Stundensatz (€)</Label>
            <Input
              id={`rates.${index}.hourly_rate`}
              type="number"
              step="0.01"
              {...form.register(`rates.${index}.hourly_rate`)}
              placeholder="z.B. 25.50"
            />
          </div>
          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => append({ service_type: "", hourly_rate: 0 })}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Stundensatz hinzufügen
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Speichern..." : "Alle Stundensätze speichern"}
        </Button>
      </div>
    </form>
  );
}