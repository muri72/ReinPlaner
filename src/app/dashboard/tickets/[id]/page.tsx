import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";
import { TicketDetailTabs } from "@/components/ticket-detail-tabs";
import { Badge } from "@/components/ui/badge";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch user profile for role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentUserRole = profile?.role || "employee";

  // Fetch ticket with related data
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(`
      *,
      customers ( name ),
      objects ( name ),
      profiles!tickets_user_id_fkey ( first_name, last_name ),
      assigned_to_profile:profiles!tickets_assigned_to_user_id_fkey ( first_name, last_name ),
      ticket_comments (
        id,
        created_at,
        user_id,
        content,
        profiles ( first_name, last_name )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !ticket) {
    console.error("Fehler beim Laden des Tickets:", error?.message || "Ticket nicht gefunden");
    redirect("/dashboard/tickets");
  }

  // Flatten the data
  const flattenedTicket = {
    ...ticket,
    customer_name: Array.isArray(ticket.customers)
      ? ticket.customers[0]?.name
      : ticket.customers?.name,
    object_name: Array.isArray(ticket.objects)
      ? ticket.objects[0]?.name
      : ticket.objects?.name,
    creator_first_name: Array.isArray(ticket.profiles)
      ? ticket.profiles[0]?.first_name
      : ticket.profiles?.first_name,
    creator_last_name: Array.isArray(ticket.profiles)
      ? ticket.profiles[0]?.last_name
      : ticket.profiles?.last_name,
    assigned_to_first_name: Array.isArray(ticket.assigned_to_profile)
      ? ticket.assigned_to_profile[0]?.first_name
      : ticket.assigned_to_profile?.first_name,
    assigned_to_last_name: Array.isArray(ticket.assigned_to_profile)
      ? ticket.assigned_to_profile[0]?.last_name
      : ticket.assigned_to_profile?.last_name,
    comments: (ticket.ticket_comments || []).map((c: any) => ({
      ...c,
      creator_first_name: Array.isArray(c.profiles)
        ? c.profiles[0]?.first_name
        : c.profiles?.first_name,
      creator_last_name: Array.isArray(c.profiles)
        ? c.profiles[0]?.last_name
        : c.profiles?.last_name,
    })),
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    const labels: Record<string, string> = {
      open: "Offen",
      in_progress: "In Bearbeitung",
      resolved: "Gelöst",
      closed: "Geschlossen",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100"}>{labels[status] || status}</Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    const labels: Record<string, string> = {
      low: "Niedrig",
      medium: "Mittel",
      high: "Hoch",
      urgent: "Dringend",
    };
    return (
      <Badge className={variants[priority] || "bg-gray-100"}>{labels[priority] || priority}</Badge>
    );
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={flattenedTicket.title}>
          <BackButtonWithParams backUrl="/dashboard/tickets" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(flattenedTicket.status)}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Priorität:</span>
                {getPriorityBadge(flattenedTicket.priority)}
              </div>
              {flattenedTicket.customer_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Kunde:</span>{" "}
                  {flattenedTicket.customer_name}
                </div>
              )}
              {flattenedTicket.object_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Objekt:</span>{" "}
                  {flattenedTicket.object_name}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <TicketDetailTabs
              ticket={flattenedTicket}
              currentUserId={user.id}
              currentUserRole={currentUserRole as any}
            />
          </div>
        </div>
      </div>
    </>
  );
}