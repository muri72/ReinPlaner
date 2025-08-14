"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, ArrowUp, ArrowDown, Users } from "lucide-react"; // Added Users
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

interface DisplayEmployee {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  status: string;
  contract_type: string | null;
  contract_end_date: string | null;
  hourly_rate: number | null;
  start_date: string | null;
  job_title: string | null;
  department: string | null;
  notes: string | null;
  address: string | null;
  date_of_birth: string | null;
  social_security_number: string | null;
  tax_id_number: string | null;
  health_insurance_provider: string | null;
}

interface EmployeesTableViewProps {
  employees: DisplayEmployee[];
  totalPages: number;
  currentPage: number;
  query: string;
  statusFilter: string;
  contractTypeFilter: string;
  sortColumn: string;
  sortDirection: string;
}

export function EmployeesTableView({
  employees,
  totalPages,
  currentPage,
  query,
  statusFilter,
  contractTypeFilter,
  sortColumn,
  sortDirection,
}: EmployeesTableViewProps) {
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
      case 'active': return 'success';
      case 'inactive': return 'destructive';
      case 'on_leave': return 'warning';
      default: return 'outline';
    }
  };

  if (employees.length === 0 && !query && !statusFilter && !contractTypeFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Mitarbeiter vorhanden</p>
        <p className="text-sm">Fügen Sie einen neuen Mitarbeiter hinzu, um Ihr Team zu erweitern.</p>
      </div>
    );
  }

  if (employees.length === 0 && (query || statusFilter || contractTypeFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Mitarbeiter gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('first_name')} className="px-0 hover:bg-transparent">
                Vorname {renderSortIcon('first_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('last_name')} className="px-0 hover:bg-transparent">
                Nachname {renderSortIcon('last_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('email')} className="px-0 hover:bg-transparent">
                E-Mail {renderSortIcon('email')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('phone')} className="px-0 hover:bg-transparent">
                Telefon {renderSortIcon('phone')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('status')} className="px-0 hover:bg-transparent">
                Status {renderSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('contract_type')} className="px-0 hover:bg-transparent">
                Vertragsart {renderSortIcon('contract_type')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('hourly_rate')} className="px-0 hover:bg-transparent">
                Stundenlohn {renderSortIcon('hourly_rate')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('job_title')} className="px-0 hover:bg-transparent">
                Position {renderSortIcon('job_title')}
              </Button>
            </TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium text-sm">{employee.first_name}</TableCell>
              <TableCell className="font-medium text-sm">{employee.last_name}</TableCell>
              <TableCell className="text-sm">{employee.email || 'N/A'}</TableCell>
              <TableCell className="text-sm">{employee.phone || 'N/A'}</TableCell>
              <TableCell className="text-sm">
                <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
              </TableCell>
              <TableCell className="text-sm">{employee.contract_type || 'N/A'}</TableCell>
              <TableCell className="text-sm">{employee.hourly_rate !== null ? `${employee.hourly_rate.toFixed(2)} €` : 'N/A'}</TableCell>
              <TableCell className="text-sm">{employee.job_title || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <RecordDetailsDialog record={employee} title={`Details zu Mitarbeiter: ${employee.first_name} ${employee.last_name}`} />
                  <EmployeeEditDialog employee={employee} />
                  <DeleteEmployeeButton employeeId={employee.id} />
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