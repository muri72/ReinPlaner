"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, CheckCircle2, XCircle, AlertCircle, User, FileText } from "lucide-react";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";

interface DisplayAbsenceRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  employees: { first_name: string | null; last_name: string | null } | null;
  user_id: string;
}

interface AbsenceRequestsGridViewProps {
  requests: DisplayAbsenceRequest[];
  query: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
  onActionSuccess: () => void;
}

export function AbsenceRequestsGridView({
  requests,
  query,
  currentUserRole,
  currentUserId,
  onActionSuccess,
}: AbsenceRequestsGridViewProps) {

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

  if (requests.length === 0 && !query) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
        <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
        <div className="mt-4">
          <AbsenceRequestCreateDialog
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onAbsenceRequestCreated={onActionSuccess}
          />
        </div>
      </div>
    );
  }

  if (requests.length === 0 && query) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
        <p className="text-sm">Ihre Suche ergab keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {requests.map((request) => (
        <div key={request.id} className="hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">
                {typeTranslations[request.type] || 'Abwesenheit'}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <AbsenceRequestEditDialog
                  request={request}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                />
                <DeleteAbsenceRequestButton
                  requestId={request.id}
                  onDeleteSuccess={onActionSuccess}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {currentUserRole !== 'employee' && request.employees && (
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Mitarbeiter: {request.employees.first_name} {request.employees.last_name}</span>
                </div>
              )}
              <div className="flex items-center">
                <CalendarOff className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Datum: {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(request.status)}
                <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
              </div>
              {request.notes && (
                <div className="flex items-start">
                  <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                  <p className="flex-grow">Notizen: {request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}