"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const userSchema = z.object({
  email: z.string().email("Ungültiges E-Mail-Format").min(1, "E-Mail ist erforderlich"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein").optional(), // Optional for updates
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  role: z.enum(["admin", "manager", "employee", "customer"]).default("employee"),
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(), // Neues Feld
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),     // Neues Feld
}).refine(data => {
  // Wenn eine Rolle zugewiesen ist, muss entweder employeeId oder customerId null sein, nicht beides
  if (data.employeeId && data.customerId) {
    return false; // Kann nicht beides gleichzeitig zugewiesen sein
  }
  return true;
}, {
  message: "Ein Benutzer kann entweder einem Mitarbeiter ODER einem Kunden zugewiesen werden, nicht beidem.",
  path: ["employeeId"], // Fehlerpfad kann beliebig sein, da es um beide Felder geht
});

export type UserFormInput = z.input<typeof userSchema>;
export type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: Partial<UserFormInput>;
  onSubmit: (data: UserFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
}

export function UserForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false }: UserFormProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; user_id: string | null }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const resolvedDefaultValues: UserFormValues = {
    email: initialData?.email ?? "",
    password: initialData?.password ?? (isEditMode ? undefined : ""),
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    role: initialData?.role ?? "employee",
    employeeId: initialData?.employeeId ?? null,
    customerId: initialData?.customerId ?? null,
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema as z.ZodSchema<UserFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  useEffect(() => {
    if (!isEditMode) { // Nur im Erstellungsmodus Dropdowns laden
      const fetchData = async () => {
        setLoadingDropdowns(true);
        // Lade alle Mitarbeiter, die noch keinem Benutzer zugewiesen sind
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, user_id')
          .is('user_id', null) // Nur nicht zugewiesene Mitarbeiter
          .order('last_name', { ascending: true });

        if (employeesError) {
          console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
          toast.error("Fehler beim Laden der Mitarbeiter.");
        }
        setEmployees(employeesData || []);

        // Lade alle Kunden, die noch keinem Benutzer zugewiesen sind
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, user_id')
          .is('user_id', null) // Nur nicht zugewiesene Kunden
          .order('name', { ascending: true });

        if (customersError) {
          console.error("Fehler beim Laden der Kunden:", customersError);
          toast.error("Fehler beim Laden der Kunden.");
        }
        setCustomers(customersData || []);
        setLoadingDropdowns(false);
      };
      fetchData();
    }
  }, [isEditMode, supabase]);

  const handleFormSubmit: SubmitHandler<UserFormValues> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="E-Mail-Adresse"
          disabled={isEditMode}
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      {!isEditMode && (
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            {...form.register("password")}
            placeholder="Passwort"
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Vorname"
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
          placeholder="Nachname"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="role">Rolle</Label>
        <Select onValueChange={(value) => form.setValue("role", value as UserFormValues["role"])} value={form.watch("role")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rolle auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Mitarbeiter</SelectItem>
            <SelectItem value="customer">Kunde</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.role.message}</p>
        )}
      </div>

      {!isEditMode && ( // Diese Felder nur im Erstellungsmodus anzeigen
        <>
          <div>
            <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("employeeId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("customerId", null); // Wenn Mitarbeiter zugewiesen, Kunde entzuweisen
                }
              }}
              value={form.watch("employeeId") || "unassigned"}
              disabled={loadingDropdowns || !!form.watch("customerId")} // Deaktivieren, wenn Kunde ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
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
              onValueChange={(value) => {
                form.setValue("customerId", value === "unassigned" ? null : value);
                if (value !== "unassigned") {
                  form.setValue("employeeId", null); // Wenn Kunde zugewiesen, Mitarbeiter entzuweisen
                }
              }}
              value={form.watch("customerId") || "unassigned"}
              disabled={loadingDropdowns || !!form.watch("employeeId")} // Deaktivieren, wenn Mitarbeiter ausgewählt
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kunden auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
                {customers.map(cust => (
                  <SelectItem key={cust.id} value={cust.id}>
                    {cust.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
            )}
          </div>
        </>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}