"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { assignUserToEntity } from "@/app/dashboard/users/actions";

const assignmentSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
});

export type UserAssignmentFormValues = z.infer<typeof assignmentSchema>;

interface UserAssignmentFormProps {
  userId: string;
  initialEmployeeId: string | null;
  initialCustomerId: string | null;
  onSuccess?: () => void;
}

export function UserAssignmentForm({ userId, initialEmployeeId, initialCustomerId, onSuccess }: UserAssignmentFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; user_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<UserAssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      employeeId: initialEmployeeId,
      customerId: initialCustomerId,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Lade alle Mitarbeiter, die entweder nicht zugewiesen sind oder diesem Benutzer zugewiesen sind
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order('last_name', { ascending: true });

      if (employeesError) {
        console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
        toast.error("Fehler beim Laden der Mitarbeiter.");
        setLoading(false);
        return;
      }
      setEmployees(employeesData || []);

      // Lade alle Kunden, die entweder nicht zugewiesen sind oder diesem Benutzer zugewiesen sind
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, user_id')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order('name', { ascending: true });

      if (customersError) {
        console.error("Fehler beim Laden der Kunden:", customersError);
        toast.error("Fehler beim Laden der Kunden.");
        setLoading(false);
        return;
      }
      setCustomers(customersData || []);
      setLoading(false);
    };

    fetchData();
  }, [userId, supabase]);

  const onSubmit: SubmitHandler<UserAssignmentFormValues> = async (data) => {
    setLoading(true);
    const result = await assignUserToEntity(userId, data.employeeId, data.customerId);

    if (result.success) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4">Lade Daten...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value === "unassigned" ? null : value)}
          value={form.watch("employeeId") || "unassigned"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} {emp.user_id && emp.user_id !== userId ? "(Bereits zugewiesen)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="customerId">Kunden zuweisen (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("customerId", value === "unassigned" ? null : value)}
          value={form.watch("customerId") || "unassigned"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunden auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
            {customers.map(cust => (
              <SelectItem key={cust.id} value={cust.id}>
                {cust.name} {cust.user_id && cust.user_id !== userId ? "(Bereits zugewiesen)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading || form.formState.isSubmitting}>
        {loading || form.formState.isSubmitting ? "Speichern..." : "Zuweisungen speichern"}
      </Button>
    </form>
  );
}