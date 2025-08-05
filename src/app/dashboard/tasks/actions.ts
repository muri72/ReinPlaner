"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TaskFormValues } from "@/components/task-form"; // Importiere den Typ
import { toast } from "sonner"; // Importiere toast für Server-Aktionen

export async function createTask(data: TaskFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    toast.error("Benutzer nicht authentifiziert.");
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { title, description, dueDate, status } = data;

  const { error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status: status || 'pending',
    });

  if (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    toast.error(`Fehler beim Erstellen der Aufgabe: ${error.message}`);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  toast.success("Aufgabe erfolgreich hinzugefügt!");
  return { success: true, message: "Aufgabe erfolgreich hinzugefügt!" };
}

export async function updateTask(taskId: string, data: TaskFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    toast.error("Benutzer nicht authentifiziert.");
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      title: data.title,
      description: data.description,
      due_date: data.dueDate ? data.dueDate.toISOString() : null,
      status: data.status,
    })
    .eq('id', taskId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Aufgaben aktualisiert werden können

  if (error) {
    console.error("Fehler beim Aktualisieren der Aufgabe:", error);
    toast.error(`Fehler beim Aktualisieren der Aufgabe: ${error.message}`);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  toast.success("Aufgabe erfolgreich aktualisiert!");
  return { success: true, message: "Aufgabe erfolgreich aktualisiert!" };
}

export async function deleteTask(formData: FormData): Promise<void> { // FIX: Rückgabetyp ist jetzt Promise<void>
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    toast.error("Benutzer nicht authentifiziert.");
    return; // Keine explizite Rückgabe
  }

  const taskId = formData.get('taskId') as string;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Aufgaben gelöscht werden können

  if (error) {
    console.error("Fehler beim Löschen der Aufgabe:", error);
    toast.error(`Fehler beim Löschen der Aufgabe: ${error.message}`);
    return; // Keine explizite Rückgabe
  }

  revalidatePath("/dashboard/tasks");
  toast.success("Aufgabe erfolgreich gelöscht!");
  return; // Keine explizite Rückgabe
}