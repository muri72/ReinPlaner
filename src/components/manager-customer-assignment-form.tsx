"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { assignCustomersToManager } from "@/app/dashboard/users/actions";

const assignmentSchema = z.object({
  customerIds: z.array(z.string().uuid()).default([]),
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface ManagerCustomerAssignmentFormProps {
  managerId: string;
  onSuccess?: () => void;
}

export function ManagerCustomerAssignmentForm({ managerId, onSuccess }: ManagerCustomerAssignmentFormProps) {
  const supabase = createClient();
  const [allCustomers, setAllCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema as z.ZodSchema<AssignmentFormValues>), // Korrektur hier
    defaultValues: {
      customerIds: [],
    },
  });

  // Lade alle Kunden und die aktuellen Zuweisungen des Managers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (customersError) {
        console.error("Fehler beim Laden der Kunden:", customersError);
        toast.error("Fehler beim Laden der Kunden.");
        setLoading(false);
        return;
      }
      setAllCustomers(customersData || []);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('manager_customer_assignments')
        .select('customer_id')
        .eq('manager_id', managerId);

      if (assignmentsError) {
        console.error("Fehler beim Laden der Zuweisungen:", assignmentsError);
        toast.error("Fehler beim Laden der Manager-Zuweisungen.");
        setLoading(false);
        return;
      }

      const assignedCustomerIds = assignmentsData?.map(a => a.customer_id) || [];
      form.setValue("customerIds", assignedCustomerIds);
      setLoading(false);
    };

    fetchData();
  }, [managerId, supabase, form]);

  const onSubmit: SubmitHandler<AssignmentFormValues> = async (data) => { // Expliziter Typ für onSubmit
    setLoading(true);
    const result = await assignCustomersToManager(managerId, data.customerIds);

    if (result.success) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4">Lade Kunden und Zuweisungen...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
        {allCustomers.length === 0 ? (
          <p className="col-span-full text-muted-foreground">Keine Kunden zum Zuweisen gefunden.</p>
        ) : (
          allCustomers.map((customer) => (
            <div key={customer.id} className="flex items-center space-x-2">
              <Checkbox
                id={`customer-${customer.id}`}
                checked={form.watch("customerIds").includes(customer.id)}
                onCheckedChange={(checked) => {
                  const currentCustomerIds = form.getValues("customerIds");
                  if (checked) {
                    form.setValue("customerIds", [...currentCustomerIds, customer.id]);
                  } else {
                    form.setValue("customerIds", currentCustomerIds.filter(id => id !== customer.id));
                  }
                }}
              />
              <Label htmlFor={`customer-${customer.id}`}>{customer.name}</Label>
            </div>
          ))
        )}
      </div>
      {form.formState.errors.customerIds && (
        <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerIds.message}</p>
        )}
      <Button type="submit" className="w-full" disabled={loading || form.formState.isSubmitting}>
        {loading || form.formState.isSubmitting ? "Speichern..." : "Zuweisungen speichern"}
      </Button>
    </form>
  );
}