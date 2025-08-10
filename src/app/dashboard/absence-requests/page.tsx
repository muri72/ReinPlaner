import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AbsenceRequestForm } from "@/components/absence-request-form";
import { createAbsenceRequest } from "./actions";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { AbsenceCalendar } from "@/components/absence-calendar";

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
    return <div className="p-8">Fehler beim Laden der Benutzerberechtigungen.</div>;
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
    return <div className="p-8">Fehler beim Laden der Abwesenheitsanträge.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="mr-2 h-4 w-4 text-success-foreground" />;
      case 'rejected': return <XCircle className="mr-2 h-4 w-4 text-destructive-foreground" />;
      case 'pending':
      default: return <AlertCircle className="mr-2 h-4 w-4 text-secondary-foreground" />;
    }
  };

  const typeTranslations: { [key: string]: string } = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    other: "Sonstiges",
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Abwesenheitsverwaltung</h1>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-8`}>
        {isAdmin && (
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold">Abwesenheitskalender</h2>
            <AbsenceCalendar />
          </div>
        )}

        <div className={isAdmin ? "lg:col-span-1" : "max-w-md mx-auto w-full"}>
          <h2 className="text-2xl font-bold mb-6">Neuen Antrag einreichen</h2>
          <AbsenceRequestForm
            onSubmit={createAbsenceRequest}
            submitButtonText="Antrag einreichen"
            currentUserRole={currentUserRole}
            currentUserId={currentUser.id}
          />
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <h2 className="text-2xl font-bold">Antragsübersicht</h2>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground">Keine Anträge gefunden.</p>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
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
                      <p className="flex-grow">Mitarbeiter-Notiz: {request.notes}</p>
                    </div>
                  )}
                  {request.admin_notes && (
                    <div className="flex items-start text-sm text-muted-foreground">
                      <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                      <p className="flex-grow">Admin-Notiz: {request.admin_notes}</p>
                    </div>
                  )}
                  <Badge variant={getStatusBadgeVariant(request.status)} className="mt-2">
                    {getStatusIcon(request.status)}
                    {request.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}