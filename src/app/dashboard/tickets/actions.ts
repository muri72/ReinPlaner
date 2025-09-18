"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import { TicketFormValues } from "@/components/ticket-form";
import { v4 as uuidv4 } from 'uuid'; // Added uuidv4 import

interface Comment {
  user_id: string;
  timestamp: string;
  text: string;
}

export async function createTicket(data: TicketFormValues): Promise<{ success: boolean; message: string; newTicketId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { customerId, objectId, title, description, priority, imageUrls } = data;

  const { data: newTicket, error } = await supabase
    .from('tickets')
    .insert({
      user_id: user.id,
      customer_id: customerId || null,
      object_id: objectId || null,
      title,
      description,
      priority,
      image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      status: 'open', // Default status for new tickets
    })
    .select('id')
    .single();

  if (error) {
    console.error("Fehler beim Erstellen des Tickets:", error?.message || error);
    return { success: false, message: `Fehler beim Erstellen des Tickets: ${error.message}` };
  }

  // Notify admins and managers
  const supabaseAdmin = createAdminClient();
  const { data: adminsAndManagers } = await supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'manager']);
  if (adminsAndManagers) {
    for (const admin of adminsAndManagers) {
      await sendNotification({
        userId: admin.id,
        title: "Neues Ticket erstellt",
        message: `Ein neues Ticket "${title}" wurde von ${user.email} erstellt.`,
        link: "/dashboard/tickets"
      });
    }
  }

  revalidatePath("/dashboard/tickets");
  revalidatePath("/portal/dashboard"); // Revalidate customer dashboard
  return { success: true, message: "Ticket erfolgreich erstellt!", newTicketId: newTicket?.id };
}

export async function updateTicket(ticketId: string, data: Partial<TicketFormValues>): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { customerId, objectId, title, description, status, priority, assignedToUserId, imageUrls } = data;

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (customerId !== undefined) updatePayload.customer_id = customerId;
  if (objectId !== undefined) updatePayload.object_id = objectId;
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (status !== undefined) updatePayload.status = status;
  if (priority !== undefined) updatePayload.priority = priority;
  if (assignedToUserId !== undefined) updatePayload.assigned_to_user_id = assignedToUserId;
  if (imageUrls !== undefined) updatePayload.image_urls = imageUrls && imageUrls.length > 0 ? imageUrls : null;

  const { error } = await supabase
    .from('tickets')
    .update(updatePayload)
    .eq('id', ticketId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Tickets:", error?.message || error);
    return { success: false, message: `Fehler beim Aktualisieren des Tickets: ${error.message}` };
  }

  // Notify assigned user if assignment changed
  if (assignedToUserId && assignedToUserId !== user.id) {
    await sendNotification({
      userId: assignedToUserId,
      title: "Ticket zugewiesen",
      message: `Ihnen wurde das Ticket "${title}" zugewiesen.`,
      link: "/dashboard/tickets"
    });
  }
  // Notify creator if status changed
  if (status) {
    const { data: ticketCreator } = await supabase.from('tickets').select('user_id').eq('id', ticketId).single();
    if (ticketCreator?.user_id && ticketCreator.user_id !== user.id) {
      await sendNotification({
        userId: ticketCreator.user_id,
        title: "Ticket-Status aktualisiert",
        message: `Der Status Ihres Tickets "${title}" wurde auf "${status}" aktualisiert.`,
        link: "/dashboard/tickets"
      });
    }
  }

  revalidatePath("/dashboard/tickets");
  revalidatePath("/portal/dashboard");
  return { success: true, message: "Ticket erfolgreich aktualisiert!" };
}

export async function deleteTicket(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const ticketId = formData.get('ticketId') as string;

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId);

  if (error) {
    console.error("Fehler beim Löschen des Tickets:", error?.message || error);
    return { success: false, message: `Fehler beim Löschen des Tickets: ${error.message}` };
  }

  revalidatePath("/dashboard/tickets");
  revalidatePath("/portal/dashboard");
  return { success: true, message: "Ticket erfolgreich gelöscht!" };
}

export async function addTicketComment(ticketId: string, commentText: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const newComment: Comment = {
    user_id: user.id,
    timestamp: new Date().toISOString(),
    text: commentText,
  };

  // Fetch existing comments and title
  const { data: existingTicket, error: fetchError } = await supabase
    .from('tickets')
    .select('comments, user_id, assigned_to_user_id, title') // Added title
    .eq('id', ticketId)
    .single();

  if (fetchError || !existingTicket) {
    console.error("Fehler beim Abrufen des Tickets für Kommentar:", fetchError?.message || fetchError);
    return { success: false, message: "Ticket nicht gefunden." };
  }

  const updatedComments = [...(existingTicket.comments || []), newComment];

  const { error } = await supabase
    .from('tickets')
    .update({ comments: updatedComments, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error("Fehler beim Hinzufügen des Kommentars:", error?.message || error);
    return { success: false, message: `Fehler beim Hinzufügen des Kommentars: ${error.message}` };
  }

  // Notify relevant users (creator, assigned user)
  const notifiedUsers = new Set<string>();
  if (existingTicket.user_id && existingTicket.user_id !== user.id) {
    notifiedUsers.add(existingTicket.user_id);
  }
  if (existingTicket.assigned_to_user_id && existingTicket.assigned_to_user_id !== user.id) {
    notifiedUsers.add(existingTicket.assigned_to_user_id);
  }

  for (const userIdToNotify of Array.from(notifiedUsers)) {
    await sendNotification({
      userId: userIdToNotify,
      title: "Neuer Kommentar zu Ihrem Ticket",
      message: `Es gibt einen neuen Kommentar zu Ticket "${existingTicket.title}".`,
      link: `/dashboard/tickets?ticketId=${ticketId}` // Link to specific ticket
    });
  }

  revalidatePath("/dashboard/tickets");
  revalidatePath("/portal/dashboard");
  return { success: true, message: "Kommentar erfolgreich hinzugefügt!" };
}

// Define types for the joined tables to help TypeScript
interface CustomerName { name: string | null; }
interface ObjectName { name: string | null; }
interface ProfileName { first_name: string | null; last_name: string | null; }

// Define a type for the raw ticket data returned by the select query
interface RawTicketQueryResult {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  customer_id: string | null;
  object_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  image_urls: string[] | null;
  comments: any[];
  customers: CustomerName[] | null;
  objects: ObjectName[] | null;
  // Explicitly allow these to be either a single object or an array of objects
  creator_profile: ProfileName | ProfileName[] | null;
  assigned_to_profile: ProfileName | ProfileName[] | null;
}

export async function getTickets(
  filters: {
    query?: string;
    status?: string;
    priority?: string;
    assignedToUserId?: string;
    customerId?: string;
    objectId?: string;
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: string;
  }
): Promise<{ success: boolean; message: string; data?: any[]; totalCount?: number | null }> { // Changed totalCount type
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const role = profile?.role || 'employee';
  const { page = 1, pageSize = 10, sortColumn = 'created_at', sortDirection = 'desc' } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = supabase
    .from('tickets')
    .select(`
      id,
      created_at,
      updated_at,
      user_id,
      customer_id,
      object_id,
      title,
      description,
      status,
      priority,
      assigned_to_user_id,
      image_urls,
      comments,
      customers ( name ),
      objects ( name ),
      creator_profile:profiles!tickets_user_id_fkey ( first_name, last_name ),
      assigned_to_profile:profiles!tickets_assigned_to_user_id_fkey ( first_name, last_name )
    `, { count: 'exact' })
    .order(sortColumn, { ascending: sortDirection === 'asc' });

  // Apply role-based filtering (RLS should handle most, but explicit filter for clarity/safety)
  if (role === 'employee' || role === 'customer') {
    queryBuilder = queryBuilder.eq('user_id', user.id);
  } else if (role === 'manager') {
    // Managers can see tickets for their assigned customers
    const { data: assignedCustomers, error: assignedCustomersError } = await supabase
      .from('manager_customer_assignments')
      .select('customer_id')
      .eq('manager_id', user.id);
    
    if (assignedCustomersError) {
      console.error("Fehler beim Laden der zugewiesenen Kunden für Manager:", assignedCustomersError);
      return { success: false, message: "Fehler beim Laden der Tickets." };
    }
    const customerIds = assignedCustomers.map(ac => ac.customer_id);
    queryBuilder = queryBuilder.in('customer_id', customerIds);
  }

  // Apply filters from searchParams
  if (filters.status) {
    queryBuilder = queryBuilder.eq('status', filters.status);
  }
  if (filters.priority) {
    queryBuilder = queryBuilder.eq('priority', filters.priority);
  }
  if (filters.assignedToUserId) {
    queryBuilder = queryBuilder.eq('assigned_to_user_id', filters.assignedToUserId);
  }
  if (filters.customerId) {
    queryBuilder = queryBuilder.eq('customer_id', filters.customerId);
  }
  if (filters.objectId) {
    queryBuilder = queryBuilder.eq('object_id', filters.objectId);
  }

  // Search query (if provided)
  if (filters.query) {
    queryBuilder = queryBuilder.or(
      `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,customers.name.ilike.%${filters.query}%,objects.name.ilike.%${filters.query}%`
    );
  }

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error("Fehler beim Laden der Tickets:", error?.message || error);
    return { success: false, message: error.message };
  }

  const mappedData = data.map((ticket: RawTicketQueryResult) => {
    // Helper to safely get a single profile from a potentially array-like nested result
    const getSingleProfile = (profileData: ProfileName | ProfileName[] | null | undefined): ProfileName | null => {
      if (!profileData) return null;
      if (Array.isArray(profileData)) {
        return profileData.length > 0 ? profileData[0] : null;
      }
      return profileData;
    };

    const creatorProfile = getSingleProfile(ticket.creator_profile);
    const assignedToProfile = getSingleProfile(ticket.assigned_to_profile);

    return {
      ...ticket,
      customer_name: (ticket.customers as CustomerName[] | null)?.[0]?.name || null,
      object_name: (ticket.objects as ObjectName[] | null)?.[0]?.name || null,
      creator_first_name: creatorProfile?.first_name || null,
      creator_last_name: creatorProfile?.last_name || null,
      assigned_to_first_name: assignedToProfile?.first_name || null,
      assigned_to_last_name: assignedToProfile?.last_name || null,
    };
  });

  return { success: true, message: "Tickets erfolgreich geladen.", data: mappedData, totalCount: count };
}

export async function generateSignedUploadUrlsForTickets(
  ticketId: string,
  files: { name: string; type: string }[]
): Promise<{ success: boolean; message: string; uploads?: { signedUrl: string; publicUrl: string }[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const supabaseAdmin = createAdminClient();
  const uploads: { signedUrl: string; publicUrl: string }[] = [];

  for (const file of files) {
    const folder = 'ticket-attachments';
    const filePath = `${folder}/${ticketId}/${uuidv4()}-${file.name}`;

    const { data, error } = await supabaseAdmin.storage
      .from("feedback-images") // Reusing the feedback-images bucket for now
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("Fehler beim Erstellen der Signed URL für Ticket-Anhang:", error?.message || error);
      return { success: false, message: `Fehler beim Erstellen der Upload-URL: ${error.message}` };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("feedback-images").getPublicUrl(filePath);
    
    uploads.push({
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    });
  }

  return { success: true, message: "Upload-URLs erfolgreich erstellt.", uploads };
}