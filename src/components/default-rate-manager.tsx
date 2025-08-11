"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getDefaultHourlyRate, updateDefaultHourlyRate } from "@/lib/actions/finances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const defaultRateSchema = z.object({
  rate: z.coerce.number().min(0, "Stundensatz muss positiv sein."),
});

type DefaultRateFormValues = z.infer<typeof defaultRateSchema>;

export function DefaultRateManager() {
  const [loading, setLoading] = useState(true);

  const form = useForm<DefaultRateFormValues>({
    resolver: zodResolver(defaultRateSchema),
  });

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      const result = await getDefaultHourlyRate();
      if (result.success && result.data) {
        form.setValue("rate", Number(result.data));
      } else {
        toast.error("Fehler beim Laden des Standard-Stundensatzes.");
      }
      setLoading(false);
    };
    fetchRate();
  }, [form]);

  const onSubmit = async (data: DefaultRateFormValues) => {
    const result = await updateDefaultHourlyRate(data.rate);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
      <div className="flex-grow">
        <Label htmlFor="default-rate">Standard-Stundenlohn (€)</Label>
        <Input
          id="default-rate"
          type="number"
          step="0.01"
          {...form.register("rate")}
        />
        {form.formState.errors.rate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.rate.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Speichern..." : "Speichern"}
      </Button>
    </form>
  );
}