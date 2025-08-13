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
import { Button } from "@/components/ui/button";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils"; // Import cn for conditional styling

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
          <div className="p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
            <AbsenceTimelineCalendar />
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold">Antragsübersicht</h2>
        <div className="flex justify-end mb-4">
          <AbsenceRequestCreateDialog currentUserRole={currentUserRole} currentUserId={currentUser.id} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
              <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
              <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
              <div className="mt-4">
                {/* The button to open the dialog is now part of AbsenceRequestCreateDialog */}
              </div>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full px-4">
              {requests.map((request) => (
                <AccordionItem
                  key={request.id}
                  value={request.id}
                  className="border rounded-xl shadow-neumorphic glassmorphism-card mb-4 data-[state=open]:border-primary/50"
                >
                  <AccordionTrigger className="flex items-center justify-between p-4 text-left hover:no-underline">
                    <div className="flex flex-col items-start flex-grow pr-4">
                      <h3 className="text-base md:text-lg font-semibold">
                        {typeTranslations[request.type] || 'Abwesenheit'}
                      </h3>
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
                      <Badge variant={getStatusBadgeVariant(request.status) as any} className="mt-2">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={currentUser.id} />
                      <DeleteAbsenceRequestButton requestId={request.id} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    {request.notes && (
                      <div className="flex items-start text-sm text-muted-foreground mb-2">
                        <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                        <p className="flex-grow">Notizen: {request.notes}</p>
                      </div>
                    )}
                    {request.admin_notes && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                        <p className="flex-grow">Admin-Notizen: {request.admin_notes}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}