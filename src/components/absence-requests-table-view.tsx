"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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
  employeeIdFilter: string;
  typeFilter: string;
  statusFilter: string;
  sortColumn: string;
  sortDirection: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
}

export function AbsenceRequestsTableView({
  requests,
  totalPages,
  currentPage,
  query,
  employeeIdFilter,
  typeFilter,
  statusFilter,
  sortColumn,
  sortDirection,
  currentUserRole,
}: AbsenceRequestsTableViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, router, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

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

  if (requests.length === 0 && !query && !employeeIdFilter && !typeFilter && !statusFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
        <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
      </div>
    );
  }

  if (requests.length === 0 && (query || employeeIdFilter || typeFilter || statusFilter)) {
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
              <TableHead className="min-w-[150px]">
                <Button variant="ghost" onClick={() => handleSort('employees.last_name')} className="px-0 hover:bg-transparent">
                  Mitarbeiter {renderSortIcon('employees.last_name')}
                </Button>
              </TableHead>
            )}
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('start_date')} className="px-0 hover:bg-transparent">
                Startdatum {renderSortIcon('start_date')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('end_date')} className="px-0 hover:bg-transparent">
                Enddatum {renderSortIcon('end_date')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('type')} className="px-0 hover:bg-transparent">
                Typ {renderSortIcon('type')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('status')} className="px-0 hover:bg-transparent">
                Status {renderSortIcon('status')}
              </Button>
            </TableHead>
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
                  <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={request.user_id} />
                  <DeleteAbsenceRequestButton requestId={request.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}