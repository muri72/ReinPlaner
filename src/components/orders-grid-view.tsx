"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, Wrench, UserRound, Star as StarIcon, Briefcase, FileStack } from "lucide-react";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { AssignedEmployee } from "@/components/order-form";

interface DisplayOrder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string | null;
  customer_id: string | null;
  object_id: string | null;
  customer_contact_id: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  assignedEmployees: AssignedEmployee[];
  order_feedback: {
    id: string;
    rating: number;
    comment: string | null;
    image_urls: string[] | null;
    created_at: string;
  }[];
  object: { recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; } | null;
}

interface OrdersGridViewProps {
  orders: DisplayOrder[];
  employees: { id: string; first_name: string | null; last_name: string | null }[];
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

export function OrdersGridView({ orders, employees, onActionSuccess }: OrdersGridViewProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': default: return 'secondary';
    }
  };

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {orders.map((order) => {
        const feedback = order.order_feedback?.[0];
        const employeeNames = (order.employee_first_names && order.employee_last_names)
          ? order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')
          : 'N/A';
        return (
          <Card key={order.id} className="shadow-neumorphic glassmorphism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">{order.title}</CardTitle>
              <div className="flex items-center space-x-2">
                <RecordDetailsDialog record={order} title={`Details zu Auftrag: ${order.title}`} />
                <OrderEditDialog order={order} />
                <DeleteOrderButton orderId={order.id} onDeleteSuccess={onActionSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="documents">Dokumente</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="text-sm text-muted-foreground">{order.description}</p>
                  {order.customer_name && <p className="text-xs text-muted-foreground mt-1">Kunde: {order.customer_name}</p>}
                  {order.object_name && <p className="text-xs text-muted-foreground">Objekt: {order.object_name}</p>}
                  {order.customer_contact_first_name && order.customer_contact_last_name && (
                    <div className="flex items-center text-xs text-muted-foreground"><UserRound className="mr-1 h-3 w-3" /><span>Auftraggeber: {order.customer_contact_first_name} {order.customer_contact_last_name}</span></div>
                  )}
                  {employeeNames !== 'N/A' && <p className="text-xs text-muted-foreground">Mitarbeiter: {employeeNames}</p>}
                  {order.service_type && <div className="flex items-center text-xs text-muted-foreground mt-1"><Wrench className="mr-1 h-3 w-3" /><span>Dienstleistung: {order.service_type}</span></div>}
                  <div className="flex items-center mt-2 space-x-2">
                    <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                    <Badge variant="outline">{order.order_type}</Badge>
                    <Badge variant={getPriorityBadgeVariant(order.priority)}>Priorität: {order.priority}</Badge>
                    <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>Anfrage: {order.request_status}</Badge>
                  </div>
                  {order.total_estimated_hours && <div className="flex items-center text-xs text-muted-foreground mt-1"><Clock className="mr-1 h-3 w-3" /><span>Geschätzte Stunden: {order.total_estimated_hours}</span></div>}
                  {order.notes && <div className="flex items-center text-xs text-muted-foreground mt-1"><FileText className="mr-1 h-3 w-3" /><span>Notizen: {order.notes}</span></div>}
                  {order.order_type === "one_time" && order.due_date && <p className="text-xs text-muted-foreground ml-auto mt-1">Fällig: {new Date(order.due_date).toLocaleDateString()}</p>}
                  {(order.order_type === "recurring" || order.order_type === "substitution") && order.recurring_start_date && <div className="flex items-center text-xs text-muted-foreground mt-1"><CalendarDays className="mr-1 h-3 w-3" /><span>Start: {new Date(order.recurring_start_date).toLocaleDateString()}</span></div>}
                  {(order.order_type === "recurring" || order.order_type === "substitution") && order.recurring_end_date && <div className="flex items-center text-xs text-muted-foreground"><CalendarDays className="mr-1 h-3 w-3" /><span>Ende: {new Date(order.recurring_end_date).toLocaleDateString()}</span></div>}
                  
                  {['recurring', 'permanent', 'substitution'].includes(order.order_type) && (
                      <div className="space-y-1 mt-2">
                          {dayNames.map(day => {
                              const assignmentsForDay = order.assignedEmployees?.map(emp => {
                                  const weekSchedule = emp.assigned_daily_schedules?.[0];
                                  const daySchedule = (weekSchedule as any)?.[day];
                                  
                                  if (daySchedule && daySchedule.start && daySchedule.end) {
                                      const employee = employees.find(e => e.id === emp.employeeId);
                                      const empInitial = employee ? `${employee.first_name?.charAt(0)}.` : '??';
                                      return `${empInitial}: ${daySchedule.start} - ${daySchedule.end}`;
                                  }
                                  return null;
                              }).filter(Boolean);

                              if (assignmentsForDay && assignmentsForDay.length > 0) {
                                  return (
                                      <div key={day} className="flex items-start text-xs text-muted-foreground">
                                          <Clock className="mr-1 h-3 w-3 mt-0.5 flex-shrink-0" />
                                          <span>{germanDayNames[day]}: {assignmentsForDay.join('; ')}</span>
                                      </div>
                                  );
                              }
                              return null;
                          })}
                      </div>
                  )}
                  {order.object?.recurrence_interval_weeks && order.object.recurrence_interval_weeks > 1 && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      <span>Objekt-Wiederholung: Alle {order.object.recurrence_interval_weeks} Wochen (Offset: {order.object.start_week_offset})</span>
                    </div>
                  )}
                  {order.assignedEmployees?.[0]?.assigned_recurrence_interval_weeks && order.assignedEmployees[0].assigned_recurrence_interval_weeks > 1 && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      <span>Mitarbeiter-Wiederholung: Alle {order.assignedEmployees[0].assigned_recurrence_interval_weeks} Wochen (Offset: {order.assignedEmployees[0].assigned_start_week_offset})</span>
                    </div>
                  )}

                  {feedback && (
                    <div className="flex items-center text-xs text-warning mt-2">
                      <StarIcon className="mr-1 h-3 w-3 fill-current" />
                      <span>Feedback vorhanden</span>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="documents" className="pt-4 space-y-4">
                  <h3 className="text-md font-semibold flex items-center">
                    <FileStack className="mr-2 h-5 w-5" /> Dokumente
                  </h3>
                  <DocumentUploader associatedOrderId={order.id} onDocumentUploaded={onActionSuccess} />
                  <DocumentList associatedOrderId={order.id} onDocumentChange={onActionSuccess} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}