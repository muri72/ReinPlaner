"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, Users, Clock, Eye } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import Link from "next/link";

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
  default_daily_schedules: any[]; // New field
  default_recurrence_interval_weeks: number; // New field
  default_start_week_offset: number; // New field
}

interface EmployeesTableViewProps {
  employees: DisplayEmployee[];
  totalPages: number;
  currentPage: number;
  query: string;
  statusFilter: string;
  contractTypeFilter: string;
}

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const germanDayNames: { [key: string]: string } = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

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

  // Filter employees based on statusFilter
  const filteredEmployees = employees.filter(employee => {
    if (statusFilter && employee.status !== statusFilter) {
      return false;
    }
    if (contractTypeFilter && employee.contract_type !== contractTypeFilter) {
      return false;
    }
    return true;
  });

  if (filteredEmployees.length === 0 && !query && !statusFilter && !contractTypeFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Mitarbeiter vorhanden</p>
        <p className="text-sm">Fügen Sie einen neuen Mitarbeiter hinzu, um Ihr Team zu erweiterten.</p>
      </div>
    );
  }

  if (filteredEmployees.length === 0 && (query || statusFilter || contractTypeFilter)) {
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
            <TableHead className="min-w-[200px]">Standard-Wochenplan</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees.map((employee) => (
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
              <TableCell className="text-sm">
                {employee.default_daily_schedules && employee.default_daily_schedules.length > 0 ? (
                  <div className="space-y-0.5">
                    {dayNames.map(day => {
                      const weekSchedule = employee.default_daily_schedules?.[0]; // Show first week as summary
                      const daySchedule = (weekSchedule as any)?.[day];
                      if (daySchedule && daySchedule.hours && daySchedule.hours > 0) {
                        return (
                          <div key={day} className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            <span>{germanDayNames[day]}: {daySchedule.start || 'N/A'} - {daySchedule.end || 'N/A'} ({daySchedule.hours.toFixed(2)}h)</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {employee.default_recurrence_interval_weeks > 1 && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <CalendarDays className="mr-1 h-3 w-3" />
                        <span>Wiederholung: Alle {employee.default_recurrence_interval_weeks} Wochen (Offset: {employee.default_start_week_offset})</span>
                      </div>
                    )}
                  </div>
                ) : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/employees/${employee.id}`} title="Details anzeigen">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}