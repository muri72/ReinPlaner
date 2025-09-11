"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { PaginationControls } from "@/components/pagination-controls";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

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
  user_id: string; // Added user_id
}

interface AbsenceRequestsTableViewProps {
  requests: DisplayAbsenceRequest[];
  totalPages: number;
  currentPage: number;
  query: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
}

export function AbsenceRequestsTableView({
  requests,
  totalPages,
  currentPage,
  query,
  currentUserRole,
}: AbsenceRequestsTableViewProps) {

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
      <div className="text-center text-muted-foreground py-8">
        <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
        <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
      </div>
    );
  }

  if (requests.length === 0 && query) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            {currentUserRole !== 'employee' && (
              <TableHead className="min-w-[150px]">Mitarbeiter</TableHead>
            )}
            <TableHead className="min-w-[120px]">Startdatum</TableHead>
            <TableHead className="min-w-[120px]">Enddatum</TableHead>
            <TableHead className="min-w-[100px]">Typ</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[200px]">Notizen</TableHead>
            {currentUserRole !== 'employee' && (
              <TableHead className="min-w-[200px]">Admin-Notizen</TableHead>
            )}
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              {currentUserRole !== 'employee' && (
                <TableCell className="font-medium text-sm">
                  {request.employees ? `${request.employees.first_name} ${request.employees.last_name}` : 'N/A'}
                </TableCell>
              )}
              <TableCell className="text-sm">{format(new Date(request.start_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell className="text-sm">{format(new Date(request.end_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell className="text-sm">{typeTranslations[request.type] || request.type}</TableCell>
              <TableCell className="text-sm">
                <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
              </TableCell>
              <TableCell className="text-sm">{request.notes || 'N/A'}</TableCell>
              {currentUserRole !== 'employee' && (
                <TableCell className="text-sm">{request.admin_notes || 'N/A'}</TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <RecordDetailsDialog record={request} title={`Details zu Abwesenheitsantrag`} />
                  <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={request.user_id} />
                  <DeleteAbsenceRequestButton requestId={request.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}