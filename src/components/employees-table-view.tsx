"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, Users } from "lucide-react"; // Added Users
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { PaginationControls } from "@/components/pagination-controls";
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
}

export function EmployeesTableView({
  employees,
  totalPages,
  currentPage,
  query,
  statusFilter,
  contractTypeFilter,
}: EmployeesTableViewProps) {

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
            <TableHead className="min-w-[150px]">Vorname</TableHead>
            <TableHead className="min-w-[150px]">Nachname</TableHead>
            <TableHead className="min-w-[150px]">E-Mail</TableHead>
            <TableHead className="min-w-[120px]">Telefon</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[120px]">Vertragsart</TableHead>
            <TableHead className="min-w-[120px]">Stundenlohn</TableHead>
            <TableHead className="min-w-[150px]">Position</TableHead>
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