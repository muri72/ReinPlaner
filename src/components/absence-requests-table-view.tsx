"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarOff, User, FileText, Umbrella, Plane, GraduationCap, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { cn } from "@/lib/utils";
import { formatEmployeeName } from "@/lib/utils/employee-utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { absenceTypeConfig, typeTranslations, statusConfig } from "@/lib/absence-type-config";

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

interface AbsenceRequestsTableViewProps {
  requests: DisplayAbsenceRequest[];
  totalPages: number;
  currentPage: number;
  query: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
  onActionSuccess?: () => void;
}

export function AbsenceRequestsTableView({
  requests,
  totalPages,
  currentPage,
  query,
  currentUserRole,
  onActionSuccess,
}: AbsenceRequestsTableViewProps) {

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'warning';
    }
  };

  // Adapter to map centralized config to component-specific format
  const typeColors: { [key: string]: { bg: string; border: string; text: string; icon: React.ReactNode } } = {
    vacation: {
      bg: absenceTypeConfig.vacation.bg,
      border: absenceTypeConfig.vacation.border,
      text: absenceTypeConfig.vacation.text,
      icon: <Plane className="h-3.5 w-3.5 mr-1" />,
    },
    sick_leave: {
      bg: absenceTypeConfig.sick_leave.bg,
      border: absenceTypeConfig.sick_leave.border,
      text: absenceTypeConfig.sick_leave.text,
      icon: <Umbrella className="h-3.5 w-3.5 mr-1" />,
    },
    training: {
      bg: absenceTypeConfig.training.bg,
      border: absenceTypeConfig.training.border,
      text: absenceTypeConfig.training.text,
      icon: <GraduationCap className="h-3.5 w-3.5 mr-1" />,
    },
    unpaid_leave: {
      bg: absenceTypeConfig.unpaid_leave.bg,
      border: absenceTypeConfig.unpaid_leave.border,
      text: absenceTypeConfig.unpaid_leave.text,
      icon: <DollarSign className="h-3.5 w-3.5 mr-1" />,
    },
  };

  if (requests.length === 0 && !query) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
        <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Keine Anträge gefunden</p>
        <p className="text-xs text-muted-foreground mt-1">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
      </div>
    );
  }

  if (requests.length === 0 && query) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
        <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Keine Anträge gefunden</p>
        <p className="text-xs text-muted-foreground mt-1">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              {currentUserRole !== 'employee' && (
                <TableHead className="text-xs font-semibold">Mitarbeiter</TableHead>
              )}
              <TableHead className="text-xs font-semibold">Start</TableHead>
              <TableHead className="text-xs font-semibold">Ende</TableHead>
              <TableHead className="text-xs font-semibold">Typ</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold max-w-[150px]">Notizen</TableHead>
              {currentUserRole !== 'employee' && (
                <TableHead className="text-xs font-semibold max-w-[150px] hidden lg:table-cell">Admin</TableHead>
              )}
              <TableHead className="text-right text-xs font-semibold">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const typeStyle = typeColors[request.type] || typeColors.other;
              return (
                <TableRow key={request.id} className="hover:bg-muted/50">
                  {currentUserRole !== 'employee' && (
                    <TableCell className="font-medium text-sm py-2">
                      {request.employees ? formatEmployeeName(request.employees) : 'N/A'}
                    </TableCell>
                  )}
                  <TableCell className="text-sm py-2">{format(new Date(request.start_date), 'dd.MM.yy', { locale: de })}</TableCell>
                  <TableCell className="text-sm py-2">{format(new Date(request.end_date), 'dd.MM.yy', { locale: de })}</TableCell>
                  <TableCell className="py-2">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
                      typeStyle.bg,
                      typeStyle.border,
                      typeStyle.text
                    )}>
                      {typeStyle.icon}
                      <span className="hidden sm:inline">{typeTranslations[request.type] || request.type}</span>
                      <span className="sm:hidden">{typeTranslations[request.type]?.charAt(0) || request.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const statusStyle = statusConfig[request.status] || statusConfig.pending;
                        const StatusIcon = statusStyle.icon;
                        return (
                          <>
                            <StatusIcon className={cn("h-4 w-4", statusStyle.iconColor)} />
                            <Badge variant={getStatusBadgeVariant(request.status)} className="text-xs h-5">
                              {request.status === 'pending' ? 'Ausst.' : request.status === 'approved' ? 'Genehm.' : 'Abgelehnt'}
                            </Badge>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-2 max-w-[150px] truncate" title={request.notes || undefined}>
                    {request.notes || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  {currentUserRole !== 'employee' && (
                    <TableCell className="text-sm py-2 max-w-[150px] truncate hidden lg:table-cell" title={request.admin_notes || undefined}>
                      {request.admin_notes || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-right py-2">
                    <div className="flex justify-end gap-1">
                      <RecordDetailsDialog record={request} title="Details" />
                      <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={request.user_id} onRequestUpdated={onActionSuccess} />
                      <DeleteAbsenceRequestButton requestId={request.id} onDeleteSuccess={onActionSuccess} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-3 font-medium">
            {currentPage} <span className="text-muted-foreground">/ {totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
