"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UsersRound, UserRoundCheck, UserRoundX, UserRoundMinus } from "lucide-react";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
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

interface EmployeesGridViewProps {
  employees: DisplayEmployee[];
  query: string;
  statusFilter: string;
  contractTypeFilter: string;
  onActionSuccess: () => void;
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

export function EmployeesGridView({
  employees,
  query,
  statusFilter,
  contractTypeFilter,
  onActionSuccess,
}: EmployeesGridViewProps) {

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'destructive';
      case 'on_leave': return 'warning';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserRoundCheck className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'inactive': return <UserRoundX className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'on_leave': return <UserRoundMinus className="mr-2 h-4 w-4 flex-shrink-0" />;
      default: return null;
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
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Mitarbeiter vorhanden</p>
        <p className="text-sm">Fügen Sie einen neuen Mitarbeiter hinzu, um Ihr Team zu erweitern.</p>
        <div className="mt-4">
          <EmployeeCreateDialog onEmployeeCreated={onActionSuccess} />
        </div>
      </div>
    );
  }

  if (filteredEmployees.length === 0 && (query || statusFilter || contractTypeFilter)) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Mitarbeiter gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {filteredEmployees.map((employee) => (
        <Link key={employee.id} href={`/dashboard/employees/${employee.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold line-clamp-2">{employee.first_name} {employee.last_name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
              {employee.job_title && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Position:</span> {employee.job_title}
                </p>
              )}
              {employee.email && (
                <p className="text-sm text-muted-foreground truncate">
                  <span className="font-medium">E-Mail:</span> {employee.email}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
                {employee.contract_type && <Badge variant="secondary">{employee.contract_type}</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}