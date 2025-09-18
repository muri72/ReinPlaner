"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  contract_type: string | null;
  hourly_rate: number | null;
  hire_date: string | null;
}

interface EmployeeSummaryCardProps {
  employee: Employee;
}

export function EmployeeSummaryCard({ employee }: EmployeeSummaryCardProps) {
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

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mitarbeiterübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center">
          {getStatusIcon(employee.status)}
          <span className="font-medium mr-2">Status:</span>
          <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
        </div>
        {employee.email && (
          <div className="flex items-center">
            <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <a href={`mailto:${employee.email}`} className="text-primary hover:underline">{employee.email}</a>
          </div>
        )}
        {employee.phone && (
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <a href={`tel:${employee.phone}`} className="text-primary hover:underline">{employee.phone}</a>
          </div>
        )}
        {employee.contract_type && (
          <div className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>Vertragsart: <Badge variant="secondary">{employee.contract_type}</Badge></span>
          </div>
        )}
        {employee.hourly_rate !== null && (
          <div className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>Stundenlohn: {employee.hourly_rate.toFixed(2)} €</span>
          </div>
        )}
        {employee.hire_date && (
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>Eingestellt am: {format(new Date(employee.hire_date), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}