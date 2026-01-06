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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { Users, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

const assignmentSchema = z.object({
  customerIds: z.array(z.string().uuid()).default([]),
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;
export type AssignmentFormInput = z.input<typeof assignmentSchema>;

interface ManagerCustomerAssignmentFormProps {
  managerId: string;
  onSuccess?: () => void;
  isInDialog?: boolean;
}

export function ManagerCustomerAssignmentForm({ managerId, onSuccess, isInDialog = false }: ManagerCustomerAssignmentFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [allCustomers, setAllCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      customerIds: [],
    },
  });

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

  const onSubmit: SubmitHandler<AssignmentFormInput> = async (data) => {
    setLoading(true);
    const ids = data.customerIds ?? [];
    const result = await assignCustomersToManager(managerId, ids);
    if (result.success) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !loading) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  // Wrapper function to call onSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await onSubmit(data);
  };

  if (loading) {
    return <div className="text-center py-8">Lade Kunden und Zuweisungen...</div>;
  }

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title="Kunden zuweisen"
            description="Wählen Sie die Kunden aus, die diesem Manager zugewiesen werden sollen"
            icon={<Users className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
              {allCustomers.length === 0 ? (
                <p className="col-span-full text-muted-foreground">Keine Kunden zum Zuweisen gefunden.</p>
              ) : (
                allCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`customer-${customer.id}`}
                      checked={(form.watch("customerIds") ?? []).includes(customer.id)}
                      onCheckedChange={(checked) => {
                        const currentCustomerIds = form.getValues("customerIds") ?? [];
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
          </FormSection>

          <FormActions
            isSubmitting={loading || form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel="Zuweisungen speichern"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gespeichert..."
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
          description="Wenn Sie das Zuweisungs-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="manager-customer-assignment-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Manager-Kunden-Zuweisung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Kunden zuweisen"
              description="Wählen Sie die Kunden aus, die diesem Manager zugewiesen werden sollen"
              icon={<Users className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                {allCustomers.length === 0 ? (
                  <p className="col-span-full text-muted-foreground">Keine Kunden zum Zuweisen gefunden.</p>
                ) : (
                  allCustomers.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`customer-${customer.id}`}
                        checked={(form.watch("customerIds") ?? []).includes(customer.id)}
                        onCheckedChange={(checked) => {
                          const currentCustomerIds = form.getValues("customerIds") ?? [];
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
            </FormSection>

            <FormActions
              isSubmitting={loading || form.formState.isSubmitting}
              onCancel={handleCancel}
              onSubmit={handleSubmitClick}
              submitLabel="Zuweisungen speichern"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gespeichert..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}