"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDateString = formData.get('dueDate') as string;
  const dueDate = dueDateString ? new Date(dueDateString) : null;

  const { error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status: 'pending', // Standardstatus
    });

  if (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/tasks");
  return { success: true, message: "Aufgabe erfolgreich hinzugefügt!" };
}

export async function deleteTask(formData: FormData) {
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