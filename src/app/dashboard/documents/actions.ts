"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from 'uuid';

interface DocumentUploadPayload {
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string; // e.g., 'employment_contract', 'customer_contract', 'other'
  associatedEmployeeId?: string | null;
  associatedCustomerId?: string | null;
  associatedOrderId?: string | null;
  description?: string | null;
}

export async function generateSignedUploadUrlForDocument(
  payload: DocumentUploadPayload
): Promise<{ success: boolean; message: string; uploadUrl?: string; publicUrl?: string; filePath?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const supabaseAdmin = createAdminClient();
  const folder = payload.documentType.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize type for folder name
  const uniqueFileName = `${uuidv4()}-${payload.fileName}`;
  const filePath = `${folder}/${uniqueFileName}`;

  try {
    // First, create the document entry in the database to satisfy RLS for storage upload
    const { data: newDocument, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: payload.fileName,
        file_path: filePath,
        file_type: payload.fileType,
        file_size: payload.fileSize,
        document_type: payload.documentType,
        associated_employee_id: payload.associatedEmployeeId || null,
        associated_customer_id: payload.associatedCustomerId || null,
        associated_order_id: payload.associatedOrderId || null,
        description: payload.description || null,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error("Fehler beim Erstellen des Dokumenteintrags in der DB:", dbError);
      return { success: false, message: `Fehler beim Vorbereiten des Dokuments: ${dbError.message}` };
    }

    // Now, get the signed upload URL for the storage bucket
    const { data, error: storageError } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUploadUrl(filePath);

    if (storageError) {
      console.error("Fehler beim Erstellen der Signed URL:", storageError);
      // If storage URL creation fails, delete the DB entry
      await supabaseAdmin.from('documents').delete().eq('id', newDocument.id);
      return { success: false, message: `Fehler beim Erstellen der Upload-URL: ${storageError.message}` };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("documents").getPublicUrl(filePath);
    
    return {
      success: true,
      message: "Upload-URL erfolgreich erstellt.",
      uploadUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      filePath: filePath,
    };
  } catch (error: any) {
    console.error("Unerwarteter Fehler beim Generieren der Upload-URL:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

export async function getDocuments(
  filters: { employeeId?: string; customerId?: string; orderId?: string }
): Promise<{ success: boolean; message: string; data?: any[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  let query = supabase.from('documents').select('*').order('created_at', { ascending: false });

  if (filters.employeeId) {
    query = query.eq('associated_employee_id', filters.employeeId);
  }
  if (filters.customerId) {
    query = query.eq('associated_customer_id', filters.customerId);
  }
  if (filters.orderId) {
    query = query.eq('associated_order_id', filters.orderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fehler beim Laden der Dokumente:", error);
    return { success: false, message: error.message };
  }

  // Generate public URLs for each document
  const documentsWithPublicUrls = data.map(doc => {
    const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(doc.file_path);
    return {
      ...doc,
      public_url: publicUrlData.publicUrl,
    };
  });

  return { success: true, message: "Dokumente erfolgreich geladen.", data: documentsWithPublicUrls };
}

export async function deleteDocument(documentId: string, filePath: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const supabaseAdmin = createAdminClient();

  // First, delete the file from storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('documents')
    .remove([filePath]);

  if (storageError) {
    console.error("Fehler beim Löschen der Datei aus dem Speicher:", storageError);
    // Continue to delete DB entry even if file deletion fails, to avoid orphaned records
  }

  // Then, delete the document entry from the database
  const { error: dbError } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (dbError) {
    console.error("Fehler beim Löschen des Dokuments aus der DB:", dbError);
    return { success: false, message: `Fehler beim Löschen des Dokuments: ${dbError.message}` };
  }

  revalidatePath("/dashboard/employees"); // Revalidate relevant pages
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers"); // If customer documents are ever displayed directly
  return { success: true, message: "Dokument erfolgreich gelöscht." };
}