"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ObjectFormValues } from "@/components/object-form";

export async function createObject(data: ObjectFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { name, address, description, customerId } = data;

  const { error } = await supabase
    .from('objects')
    .insert({
      user_id: user.id,
      name,
      address,
      description,
      customer_id: customerId,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Objekts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich hinzugefügt!" };
}

export async function updateObject(objectId: string, data: ObjectFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('objects')
    .update({
      name: data.name,
      address: data.address,
      description: data.description,
      customer_id: data.customerId,
    })
    .eq('id', objectId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Aktualisieren des Objekts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich aktualisiert!" };
}

export async function deleteObject(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const objectId = formData.get('objectId') as string;

  const { error } = await supabase
    .from('objects')
    .delete()
    .eq('id', objectId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Löschen des Objekts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich gelöscht!" };
}