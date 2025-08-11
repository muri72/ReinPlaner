"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getServiceRates, updateServiceRates } from "@/lib/actions/finances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const serviceRateSchema = z.object({
  rates: z.array(z.object({
    service_type: z.string(),
    hourly_rate: z.coerce.number().min(0, "Stundensatz muss positiv sein."),
  })),
});

type ServiceRateFormValues = z.infer<typeof serviceRateSchema>;

export function ServiceRateManager() {
  const [loading, setLoading] = useState(true);

  const form = useForm<ServiceRateFormValues>({
    resolver: zodResolver(serviceRateSchema),
    defaultValues: {
      rates: [],
    },
  });

  const { fields, append } = useFieldArray({
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-4">
          <div className="flex-grow">
            <Label htmlFor={`rates.${index}.service_type`}>Dienstleistung</Label>
            <Input
              id={`rates.${index}.service_type`}
              {...form.register(`rates.${index}.service_type`)}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="w-40">
            <Label htmlFor={`rates.${index}.hourly_rate`}>Stundensatz (€)</Label>
            <Input
              id={`rates.${index}.hourly_rate`}
              type="number"
              step="0.01"
              {...form.register(`rates.${index}.hourly_rate`)}
            />
            {form.formState.errors.rates?.[index]?.hourly_rate && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.rates[index]?.hourly_rate?.message}</p>
            )}
          </div>
        </div>
      ))}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Speichern..." : "Stundensätze speichern"}
      </Button>
    </form>
  );
}