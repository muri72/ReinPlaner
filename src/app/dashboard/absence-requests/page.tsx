import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle, PlusCircle } from "lucide-react";
import { AbsenceRequestForm } from "@/components/absence-request-form";
import { createAbsenceRequest } from "./actions";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { AbsenceTimelineCalendar } from "@/components/absence-timeline-calendar";
import { Button } from "@/components/ui/button"; // Hinzugefügt
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog"; // Import the new dialog

export default async function AbsenceRequestsPage() {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Laden des Benutzerprofils:", profileError);
    return <div className="p-4 md:p-8">Fehler beim Laden der Benutzerberechtigungen.</div>;
  }

  const currentUserRole = profile.role as 'admin' | 'manager' | 'employee';
  const isAdmin = currentUserRole === 'admin';

  const { data: requests, error } = await supabase
    .from('absence_requests')
    .select(`
      *,
      employees ( first_name, last_name )
    `)
    .order('start_date', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Abwesenheitsanträge:", error);
    return <div className="p-4 md:p-8">Fehler beim Laden der Abwesenheitsanträge.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="mr-2 h-4 w-4 text-success-foreground" />;
      case 'rejected': return <XCircle className="mr-2 h-4 w-4 text-destructive-foreground" />;
      case 'pending':
      default: return <AlertCircle className="mr-2 h-4 w-4 text-warning-foreground" />;
    }
  };

  const typeTranslations: { [key: string]: string } = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    other: "Sonstiges",
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Abwesenheitsverwaltung</h1>

      {isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold">Monatsübersicht Abwesenheiten</h2>
          <AbsenceTimelineCalendar />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold">Antragsübersicht</h2>
          <div className="flex justify-end mb-4">
            <AbsenceRequestCreateDialog currentUserRole={currentUserRole} currentUserId={currentUser.id} />
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            {requests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
                <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
                <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
                <div className="mt-4">
                  {/* The button to open the dialog is now part of AbsenceRequestCreateDialog */}
                </div>
              </div>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="shadow-elevation-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">
                      {typeTranslations[request.type] || 'Abwesenheit'}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={currentUser.id} />
                      <DeleteAbsenceRequestButton requestId={request.id} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentUserRole !== 'employee' && request.employees && (
                       <div className="flex items-center text-sm text-muted-foreground">
                         <User className="mr-2 h-4 w-4" />
                         <span>{request.employees.first_name} {request.employees.last_name}</span>
                       </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarOff className="mr-2 h-4 w-4" />
                      <span>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
                    </div>
                    {request.notes && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                        <p className="flex-grow">{request.notes}</p>
                      </div>
                    )}
                    {request.admin_notes && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                        <p className="flex-grow">{request.admin_notes}</p>
                      </div>
                    )}
                    <Badge variant={getStatusBadgeVariant(request.status) as any} className="mt-2">
                      {getStatusIcon(request.status)}
                      {request.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Removed the inline form section */}
        <div className="hidden"></div>
      </div>
    </div>
  );
}