"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, FileText, MapPin, Cake, CreditCard, Shield, UsersRound, FileStack, Clock } from "lucide-react";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";

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
        <Card key={employee.id} className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base md:text-lg font-semibold">{employee.first_name} {employee.last_name}</CardTitle>
            <div className="flex items-center space-x-2">
              <RecordDetailsDialog record={employee} title={`Details zu Mitarbeiter: ${employee.first_name} ${employee.last_name}`} />
              <EmployeeEditDialog employee={employee} />
              <DeleteEmployeeButton employeeId={employee.id} onDeleteSuccess={onActionSuccess} />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Dokumente</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
                {employee.email && (
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.job_title && (
                  <div className="flex items-center">
                    <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Position: {employee.job_title}</span>
                  </div>
                )}
                {employee.contract_type && (
                  <div className="flex items-center">
                    <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Vertragsart: <Badge variant="secondary">{employee.contract_type}</Badge></span>
                  </div>
                )}
                <div className="flex items-center">
                  {getStatusIcon(employee.status)}
                  <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
                </div>
                {employee.default_daily_schedules && employee.default_daily_schedules.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="font-semibold text-xs">Standard-Wochenplan:</p>
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
                )}
              </TabsContent>
              <TabsContent value="documents" className="pt-4 space-y-4">
                <h3 className="text-md font-semibold flex items-center">
                  <FileStack className="mr-2 h-5 w-5" /> Dokumente
                </h3>
                <DocumentUploader associatedEmployeeId={employee.id} onDocumentUploaded={onActionSuccess} />
                <DocumentList associatedEmployeeId={employee.id} onDocumentChange={onActionSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}