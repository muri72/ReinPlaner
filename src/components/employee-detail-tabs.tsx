"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Separator } from "@/components/ui/separator";
import { EmployeeTimeEntriesList } from "./employee-time-entries-list";
import { EmployeeOrdersList } from "./employee-orders-list";
import { EmployeeAbsencesList } from "./employee-absences-list";

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  type: string;
  notes: string | null;
  orders: { title: string | null } | null;
  objects: { name: string | null } | null;
}

interface Order {
  id: string;
  title: string;
  status: string;
  order_type: string;
  due_date: string | null;
  start_date: string | null;
  recurring_end_date: string | null;
  objects: { name: string | null } | null;
}

interface AbsenceRequest {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  status: "active" | "inactive" | "on_leave";
  contract_type: "full_time" | "part_time" | "minijob" | "freelancer" | null;
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
  can_work_holidays: boolean;
  default_daily_schedules: any[];
  default_recurrence_interval_weeks: number;
  default_start_week_offset: number;
  time_entries: TimeEntry[];
  orders: Order[];
  absence_requests: AbsenceRequest[];
}

interface EmployeeDetailTabsProps {
  employee: Employee;
}

export function EmployeeDetailTabs({ employee }: EmployeeDetailTabsProps) {
  const [documentUpdateKey, setDocumentUpdateKey] = useState(0);

  return (
    <Tabs defaultValue="stammdaten" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="auftraege">Aufträge</TabsTrigger>
        <TabsTrigger value="arbeitszeiten">Arbeitszeiten</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
        <TabsTrigger value="abwesenheiten">Abwesenheiten</TabsTrigger>
      </TabsList>
      <TabsContent value="stammdaten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Persönliche und vertragliche Informationen.</CardDescription>
            </div>
            <div className="flex space-x-2">
              <EmployeeEditDialog employee={employee} />
              <DeleteEmployeeButton employeeId={employee.id} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Adresse</p>
                <p>{employee.address || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Geburtsdatum</p>
                <p>{employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd.MM.yyyy', { locale: de }) : 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Sozialversicherungsnummer</p>
                <p>{employee.social_security_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Steuer-ID</p>
                <p>{employee.tax_id_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Krankenkasse</p>
                <p>{employee.health_insurance_provider || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Bereit für Feiertagsarbeit</p>
                <p>{employee.can_work_holidays ? 'Ja' : 'Nein'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Vertragsstart</p>
                <p>{employee.start_date ? format(new Date(employee.start_date), 'dd.MM.yyyy', { locale: de }) : 'N/A'}</p>
              </div>
              {employee.contract_end_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Vertragsende</p>
                  <p>{format(new Date(employee.contract_end_date), 'dd.MM.yyyy', { locale: de })}</p>
                </div>
              )}
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Notizen</p>
                <p className="whitespace-pre-wrap">{employee.notes || 'Keine Notizen vorhanden.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="auftraege">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Zugewiesene Aufträge</CardTitle>
            <CardDescription>Alle Aufträge, denen dieser Mitarbeiter zugewiesen ist.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeOrdersList orders={(employee as any).orders || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="arbeitszeiten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Arbeitszeiten</CardTitle>
            <CardDescription>Eine Liste der letzten Zeiteinträge für diesen Mitarbeiter.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTimeEntriesList timeEntries={employee.time_entries || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="dokumente">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Verwalten Sie Dokumente, die mit diesem Mitarbeiter verknüpft sind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader 
              associatedEmployeeId={employee.id} 
              onDocumentUploaded={() => setDocumentUpdateKey(prev => prev + 1)} 
            />
            <Separator />
            <DocumentList 
              key={documentUpdateKey} 
              associatedEmployeeId={employee.id} 
              onDocumentChange={() => setDocumentUpdateKey(prev => prev + 1)}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="abwesenheiten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Abwesenheiten</CardTitle>
            <CardDescription>Eine Liste aller Abwesenheitsanträge für diesen Mitarbeiter.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeAbsencesList absences={employee.absence_requests || []} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}