"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, Wrench, UserRound, Star as StarIcon, Briefcase, Eye } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AssignedEmployee } from "@/components/order-form";
import Link from "next/link";
import { parseLocalDate } from "@/lib/utils";

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
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  assignedEmployees: AssignedEmployee[];
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  order_feedback: {
    id: string;
    rating: number;
    comment: string | null;
    image_urls: string[] | null;
    created_at: string;
  }[];
  object: { recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; } | null;
}

interface OrdersTableViewProps {
  orders: DisplayOrder[];
  onActionSuccess: () => void;
}

export function OrdersTableView({
  orders,
  onActionSuccess,
}: OrdersTableViewProps) {

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
        <p className="text-sm">Ihre Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Auftrag</TableHead>
            <TableHead className="min-w-[120px]">Kunde</TableHead>
            <TableHead className="min-w-[120px]">Objekt</TableHead>
            <TableHead className="min-w-[120px]">Mitarbeiter</TableHead>
            <TableHead className="min-w-[100px]">Dienstleistung</TableHead>
            <TableHead className="min-w-[100px]">Typ</TableHead>
            <TableHead className="min-w-[100px]">Priorität</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[120px]">Zeitraum</TableHead>
            <TableHead className="min-w-[120px]">Stunden (Ø/Gesamt)</TableHead>
            <TableHead className="min-w-[80px]">Feedback</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const feedback = order.order_feedback?.[0];
            const employeeNames = (order.employee_first_names && order.employee_last_names)
              ? order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')
              : 'N/A';
            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-sm">{order.title}</TableCell>
                <TableCell className="text-sm">{order.customer_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">{order.object_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">
                  {employeeNames}
                </TableCell>
                <TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell>
                <TableCell><Badge variant="outline">{order.order_type}</Badge></TableCell>
                <TableCell><Badge variant={getPriorityBadgeVariant(order.priority)}>{order.priority}</Badge></TableCell>
                <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                <TableCell className="text-sm">
                  {order.order_type === "one_time" && order.due_date && (
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(parseLocalDate(order.due_date)!, 'dd.MM.yyyy', { locale: de })}
                    </div>
                  )}
                  {(order.order_type === "recurring" || order.order_type === "substitution" || order.order_type === "permanent") && order.recurring_start_date && (
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(parseLocalDate(order.recurring_start_date)!, 'dd.MM.yyyy', { locale: de })}
                      {order.recurring_end_date && ` - ${format(parseLocalDate(order.recurring_end_date)!, 'dd.MM.yyyy', { locale: de })}`}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">{order.total_estimated_hours?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell>
                  {feedback && (
                    <div className="flex items-center text-warning">
                      <StarIcon className="h-4 w-4 fill-current" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/orders/${order.id}`} title="Details anzeigen">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}