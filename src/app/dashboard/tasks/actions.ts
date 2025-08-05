"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TaskFormValues } from "@/components/task-form"; // Importiere den Typ

export async function createTask(data: TaskFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  return { success: true, message: "Aufgabe erfolgreich hinzugefügt!" };
}

export async function updateTask(taskId: string, data: TaskFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  return { success: true, message: "Aufgabe erfolgreich aktualisiert!" };
}

export async function deleteTask(formData: FormData): Promise<{ success: boolean; message: string }> { // FIX: Rückgabetyp ist jetzt Promise<{ success: boolean; message: string }>
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const taskId = formData.get('taskId') as string;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Aufgaben gelöscht werden können

  if (error) {
    console.error("Fehler beim Löschen der Aufgabe:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  return { success: true, message: "Aufgabe erfolgreich gelöscht!" };
}