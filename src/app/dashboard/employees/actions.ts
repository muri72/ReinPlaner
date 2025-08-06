"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EmployeeFormValues } from "@/components/employee-form";

export async function createEmployee(data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { firstName, lastName, email, phone, hireDate, status } = data;

  const { error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      hire_date: hireDate ? hireDate.toISOString() : null,
      status,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich hinzugefügt!" };
}

export async function updateEmployee(employeeId: string, data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('employees')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      hire_date: data.hireDate ? data.hireDate.toISOString() : null,
      status: data.status,
    })
    .eq('id', employeeId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Aktualisieren des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich aktualisiert!" };
}

export async function deleteEmployee(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const employeeId = formData.get('employeeId') as string;

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Löschen des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich gelöscht!" };
}