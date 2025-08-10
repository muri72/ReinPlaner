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
import { DatePicker } from "@/components/date-picker";

// Define the schema for absence request form values
export const absenceRequestSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").min(1, "Mitarbeiter ist erforderlich"),
  startDate: z.date({ required_error: "Startdatum ist erforderlich" }),
  endDate: z.date({ required_error: "Enddatum ist erforderlich" }),
  type: z.enum(["vacation", "sick_leave", "training", "other"], { required_error: "Abwesenheitstyp ist erforderlich" }).default("vacation"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  adminNotes: z.string().max(500, "Admin-Notizen sind zu lang").optional().nullable(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "Enddatum muss nach oder am Startdatum liegen.",
  path: ["endDate"],
});

export type AbsenceRequestFormValues = z.infer<typeof absenceRequestSchema>;

interface AbsenceRequestFormProps {
  initialData?: Partial<AbsenceRequestFormValues>;
  onSubmit: (data: AbsenceRequestFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function AbsenceRequestForm({ initialData, onSubmit, submitButtonText, onSuccess, currentUserRole, currentUserId }: AbsenceRequestFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  const resolvedDefaultValues: AbsenceRequestFormValues = {
    employeeId: initialData?.employeeId ?? "",
    startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
    endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(),
    type: initialData?.type ?? "vacation",
    status: initialData?.status ?? "pending",
    notes: initialData?.notes ?? null,
    adminNotes: initialData?.adminNotes ?? null,
  };

  const form = useForm<AbsenceRequestFormValues>({
    resolver: zodResolver(absenceRequestSchema as z.ZodSchema<AbsenceRequestFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

  useEffect(() => {
    const fetchEmployees = async () => {
      let query = supabase.from('employees').select('id, first_name, last_name, user_id');
      const { data, error } = await query;

      if (error) {
        console.error("Fehler beim Laden der Mitarbeiter:", error);
        toast.error("Fehler beim Laden der Mitarbeiter.");
        return;
      }

      if (isManagerOrAdmin) {
        setEmployees(data || []);
      } else {
        const userEmployee = data?.find(emp => emp.user_id === currentUserId);
        if (userEmployee) {
          setEmployees([userEmployee]);
          form.setValue("employeeId", userEmployee.id);
        }
      }
    };
    fetchEmployees();
  }, [supabase, isManagerOrAdmin, currentUserId, form]);

  const handleFormSubmit: SubmitHandler<AbsenceRequestFormValues> = async (data) => {
    const result = await onSubmit(data);
    if (result.success) {
      toast.success(result.message);
      if (!initialData) form.reset();
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  const typeOptions = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    other: "Sonstiges",
  };

  const statusOptions = {
    pending: "Ausstehend",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
      <div>
        <Label htmlFor="employeeId">Mitarbeiter</Label>
        <Select onValueChange={(value) => form.setValue("employeeId", value)} value={form.watch("employeeId")} disabled={!isManagerOrAdmin}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker label="Startdatum" value={form.watch("startDate")} onChange={(date) => form.setValue("startDate", date || new Date())} error={form.formState.errors.startDate?.message} />
        <DatePicker label="Enddatum" value={form.watch("endDate")} onChange={(date) => form.setValue("endDate", date || new Date())} error={form.formState.errors.endDate?.message} />
      </div>
      {form.formState.errors.endDate && <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>}

      <div>
        <Label htmlFor="type">Art der Abwesenheit</Label>
        <Select onValueChange={(value) => form.setValue("type", value as AbsenceRequestFormValues["type"])} value={form.watch("type")}>
          <SelectTrigger><SelectValue placeholder="Art auswählen" /></SelectTrigger>
          <SelectContent>
            {Object.entries(typeOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.type && <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea id="notes" {...form.register("notes")} placeholder="Grund für die Abwesenheit..." rows={3} />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      {isManagerOrAdmin && (
        <>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="text-md font-semibold">Admin-Bereich</h3>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => form.setValue("status", value as AbsenceRequestFormValues["status"])} value={form.watch("status")}>
                <SelectTrigger><SelectValue placeholder="Status auswählen" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin-Notizen (optional)</Label>
              <Textarea id="adminNotes" {...form.register("adminNotes")} placeholder="Interne Notizen zum Antrag..." rows={3} />
              {form.formState.errors.adminNotes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.adminNotes.message}</p>}
            </div>
          </div>
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}