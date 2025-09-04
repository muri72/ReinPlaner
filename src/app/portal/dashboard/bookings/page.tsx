import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, getWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CalendarDays, Building, Wrench, FileText, Clock, MessageSquare } from "lucide-react";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog";
import { OrderFeedbackDialog } from "@/components/order-feedback-dialog"; // For giving feedback on completed orders
import { Button } from "@/components/ui/button"; // Import Button
import { AssignedEmployee } from "@/components/order-form";
import { TicketCreateDialog } from "@/components/ticket-create-dialog"; // Import TicketCreateDialog

interface DisplayOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  customer_id: string | null;
  object_id: string | null;
  employee_ids: string[] | null; // Updated to array of IDs
  employee_first_names: string[] | null; // Updated to array of first names
  employee_last_names: string[] | null; // Updated to array of last names
  assignedEmployees: AssignedEmployee[];
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null; // Corrected column name
  notes: string | null;
  request_status: string;
  service_type: string | null;
  order_feedback: { id: string }[]; // To check if feedback exists
  object: { recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; } | null;
}

// Define an interface for the raw data returned by Supabase select query
interface RawOrderResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  customer_id: string | null; // Direct column
  object_id: string | null; // Direct column
  customer_contact_id: string | null; // Direct column
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  customers: { name: string }[] | null;
  objects: { name: string; recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; }[] | null;
  customer_contacts: { first_name: string | null; last_name: string | null }[] | null;
  order_feedback: { id: string }[] | null;
  order_employee_assignments: { 
    employee_id: string; 
    assigned_daily_schedules: any[];
    assigned_recurrence_interval_weeks: number;
    assigned_start_week_offset: number;
    employees: { first_name: string | null; last_name: string | null }[] | null 
  }[] | null;
}

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const germanDayNames: { [key: string]: string } = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'customer') {
    redirect("/dashboard");
  }

  const customerIdResult = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const customerId = customerIdResult.data?.id || null;

  let allCustomerOrders: DisplayOrder[] = [];
  if (customerId) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        description,
        status,
        due_date,
        customer_id,
        object_id,
        customer_contact_id,
        order_type,
        recurring_start_date,
        recurring_end_date,
        priority,
        total_estimated_hours,
        notes,
        request_status,
        service_type,
        objects ( name, recurrence_interval_weeks, start_week_offset, daily_schedules ),
        customers ( name ),
        customer_contacts ( first_name, last_name ),
        order_feedback ( id ),
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_schedules,
          assigned_recurrence_interval_weeks, assigned_start_week_offset,
          employees ( first_name, last_name ) 
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Kundenaufträge:", error?.message || JSON.stringify(error));
    } else {
      allCustomerOrders = data.map((order: RawOrderResponse) => {
        const mappedAssignments: AssignedEmployee[] = order.order_employee_assignments?.map((a: any) => ({
            employeeId: a.employee_id,
            assigned_daily_schedules: a.assigned_daily_schedules,
            assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
            assigned_start_week_offset: a.assigned_start_week_offset,
        })) || [];

        return {
          id: order.id,
          title: order.title,
          description: order.description,
          status: order.status,
          due_date: order.due_date,
          customer_id: order.customer_id,
          object_id: order.object_id,
          employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
          employee_first_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.first_name || '') || null,
          employee_last_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.last_name || '') || null,
          assignedEmployees: mappedAssignments,
          customer_contact_id: order.customer_contact_id,
          customer_name: order.customers?.[0]?.name || null,
          object_name: order.objects?.[0]?.name || null,
          customer_contact_first_name: order.customer_<dyad-problem-report summary="4 problems">
<problem file="src/app/dashboard/tickets/actions.ts" line="328" column="26" code="2352">Conversion of type '{ first_name: any; last_name: any; }[]' to type 'ProfileName' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ first_name: any; last_name: any; }[]' is missing the following properties from type 'ProfileName': first_name, last_name</problem>
<problem file="src/app/dashboard/tickets/actions.ts" line="329" column="25" code="2352">Conversion of type '{ first_name: any; last_name: any; }[]' to type 'ProfileName' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ first_name: any; last_name: any; }[]' is missing the following properties from type 'ProfileName': first_name, last_name</problem>
<problem file="src/app/dashboard/tickets/actions.ts" line="330" column="30" code="2352">Conversion of type '{ first_name: any; last_name: any; }[]' to type 'ProfileName' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ first_name: any; last_name: any; }[]' is missing the following properties from type 'ProfileName': first_name, last_name</problem>
<problem file="src/app/dashboard/tickets/actions.ts" line="331" column="29" code="2352">Conversion of type '{ first_name: any; last_name: any; }[]' to type 'ProfileName' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ first_name: any; last_name: any; }[]' is missing the following properties from type 'ProfileName': first_name, last_name</problem>
</dyad-problem-report><think>**Addressing TypeScript Errors**

I've hit a snag with the TypeScript compiler in `src/app/dashboard/tickets/actions.ts`. Specifically, I'm getting four `TS2352` errors when trying to convert an array to a single `ProfileName` object. I'm focusing on the `getTickets` function, trying to understand why this type mismatch is happening during compilation. Currently, I'm debugging the `getTickets` function.


**Resolving Type Mismatches**

I'm deep in the weeds with those TypeScript errors in `src/app/dashboard/tickets/actions.ts`. I've determined that the `creator_profile` and `assigned_to_profile` fields, despite being aliased, are being interpreted as arrays, not single `ProfileName` objects as I expected. This is happening because Supabase's `select` statement returns arrays for related data, even for one-to-one relationships. I'm focusing on how to ensure the data is treated as a single object or `null` within the `getTickets` function.


**Analyzing Supabase Response**

I'm now zeroing in on why Supabase is returning arrays for `creator_profile` and `assigned_to_profile` even though the relationship should be one-to-one.  It seems the `select` statement, even with aliases, isn't inherently treating these as single objects. I'm considering using `.single()` within the Supabase query itself to guarantee the correct data structure, or refining the current array access logic within `getTickets`. I'm verifying the current mapping logic thoroughly.


**Adjusting Profile Handling**

I'm now implementing the `getSingleProfile` helper function to handle the potentially array-like `creator_profile` and `assigned_to_profile` data. The goal is to consistently return a single `ProfileName` object or `null` for each field, ensuring type safety. I'm focusing on rigorously testing the handling of both single objects and array scenarios within the `getTickets` function.


**Streamlining Data Handling**

I've implemented the `getSingleProfile` helper function to robustly handle the nested Supabase responses. This approach ensures I'm always returning either a `ProfileName` object or `null`. I've also refactored the `mappedData` logic in the `getTickets` function to be cleaner and more explicit. This solution seems to be the most promising.


</think>Entschuldigung für die erneuten TypeScript-Fehler. Das Problem liegt in der Typisierung der verschachtelten `profiles`-Daten, die von Supabase zurückgegeben werden. Obwohl es sich um eine 1:1-Beziehung handelt, kann Supabase das Ergebnis manchmal als Array zurückgeben, wenn es über Aliase in einer komplexeren `select`-Abfrage abgerufen wird.

Ich werde die `src/app/dashboard/tickets/actions.ts`-Datei anpassen, um dies robuster zu handhaben, indem ich eine Hilfsfunktion verwende, die sicherstellt, dass immer ein einzelnes Profilobjekt (oder `null`) zurückgegeben wird, bevor auf `first_name` oder `last_name` zugegriffen wird.

<dyad-write path="src/app/dashboard/tickets/actions.ts" description="Fixing TypeScript errors by safely accessing aliased profile data.">
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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

  const mappedData = data.map(ticket => {
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
  const supabase = await createClient();
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