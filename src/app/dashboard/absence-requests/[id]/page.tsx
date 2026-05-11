import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";
import { AbsenceRequestDetailTabs } from "@/components/absence-request-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default async function AbsenceRequestDetailPage({
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

  // Fetch absence request
  const { data: absenceRequest, error } = await supabase
    .from("absence_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !absenceRequest) {
    console.error(
      "Fehler beim Laden des Abwesenheitsantrags:",
      error?.message || "Antrag nicht gefunden"
    );
    redirect("/dashboard/absence-requests");
  }

  // Fetch employee separately (no FK constraint exists for embedded join)
  const { data: employeeRows } = await supabase
    .from("employees")
    .select("first_name, last_name, user_id")
    .eq("id", absenceRequest.employee_id)
    .limit(1);

  const employee = employeeRows?.[0] || null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    const labels: Record<string, string> = {
      pending: "Ausstehend",
      approved: "Genehmigt",
      rejected: "Abgelehnt",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Urlaub",
      sick_leave: "Krankheit",
      training: "Weiterbildung",
      unpaid_leave: "Unbezahlter Urlaub",
    };
    return labels[type] || type;
  };

  const startDate = new Date(absenceRequest.start_date);
  const endDate = new Date(absenceRequest.end_date);

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={`${getTypeLabel(absenceRequest.type)} - Antrag`}>
          <BackButtonWithParams backUrl="/dashboard/absence-requests" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(absenceRequest.status)}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Typ:</span>{" "}
                {getTypeLabel(absenceRequest.type)}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Mitarbeiter:</span>{" "}
                {employee
                  ? [employee.first_name, employee.last_name]
                      .filter(Boolean)
                      .join(" ")
                  : "Unbekannt"}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Zeitraum:</span>
                <p className="mt-1">
                  {format(startDate, "dd.MM.yyyy", { locale: de })} -{" "}
                  {format(endDate, "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <AbsenceRequestDetailTabs
              absenceRequest={absenceRequest}
              currentUserId={user.id}
              currentUserRole={currentUserRole as any}
            />
          </div>
        </div>
      </div>
    </>
  );
}