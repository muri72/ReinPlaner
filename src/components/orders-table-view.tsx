"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, Wrench, UserRound, Star as StarIcon, Briefcase, ArrowUp, ArrowDown } from "lucide-react";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { PaginationControls } from "@/components/pagination-controls";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useRouter, useSearchParams, usePathname } from "next/navigation"; // Import usePathname
import { useCallback } from "react";
import { cn } from "@/lib/utils"; // Import cn for conditional styling
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

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
  employee_id: string | null;
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  estimated_hours: number | null;
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
}

interface OrdersTableViewProps {
  orders: DisplayOrder[];
  totalPages: number;
  currentPage: number;
  query: string;
  statusFilter: string;
  orderTypeFilter: string;
  serviceTypeFilter: string;
  customerIdFilter: string;
  employeeIdFilter: string;
  customers: { id: string; name: string }[];
  employees: { id: string; first_name: string | null; last_name: string | null }[];
  availableServices: readonly string[];
  sortColumn: string;
  sortDirection: string;
}

export function OrdersTableView({
  orders,
  totalPages,
  currentPage,
  query,
  statusFilter,
  orderTypeFilter,
  serviceTypeFilter,
  customerIdFilter,
  employeeIdFilter,
  customers,
  employees,
  availableServices,
  sortColumn,
  sortDirection,
}: OrdersTableViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1'); // Reset to first page on sort change
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, router, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  if (orders.length === 0 && !query && !statusFilter && !orderTypeFilter && !serviceTypeFilter && !customerIdFilter && !employeeIdFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Aufträge vorhanden</p>
        <p className="text-sm">Beginnen Sie, indem Sie einen neuen Auftrag hinzufügen.</p>
      </div>
    );
  }

  if (orders.length === 0 && (query || statusFilter || orderTypeFilter || serviceTypeFilter || customerIdFilter || employeeIdFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
        <p className="text-sm">Ihre Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card"> {/* Added styling here */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('title')} className="px-0 hover:bg-transparent">
                Auftrag {renderSortIcon('title')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('customers.name')} className="px-0 hover:bg-transparent">
                Kunde {renderSortIcon('customers.name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('objects.name')} className="px-0 hover:bg-transparent">
                Objekt {renderSortIcon('objects.name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('employees.last_name')} className="px-0 hover:bg-transparent">
                Mitarbeiter {renderSortIcon('employees.last_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('service_type')} className="px-0 hover:bg-transparent">
                Dienstleistung {renderSortIcon('service_type')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('order_type')} className="px-0 hover:bg-transparent">
                Typ {renderSortIcon('order_type')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('priority')} className="px-0 hover:bg-transparent">
                Priorität {renderSortIcon('priority')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('status')} className="px-0 hover:bg-transparent">
                Status {renderSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('due_date')} className="px-0 hover:bg-transparent">
                Zeitraum {renderSortIcon('due_date')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[80px]">Feedback</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const feedback = order.order_feedback?.[0];
            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-sm">{order.title}</TableCell>
                <TableCell className="text-sm">{order.customer_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">{order.object_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">
                  {order.employee_first_name && order.employee_last_name
                    ? `${order.employee_first_name} ${order.employee_last_name}`
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell>
                <TableCell><Badge variant="outline">{order.order_type}</Badge></TableCell>
                <TableCell><Badge variant={getPriorityBadgeVariant(order.priority)}>{order.priority}</Badge></TableCell>
                <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                <TableCell className="text-sm">
                  {order.order_type === "one_time" && order.due_date && (
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(new Date(order.due_date), 'dd.MM.yyyy', { locale: de })}
                    </div>
                  )}
                  {(order.order_type === "recurring" || order.order_type === "substitution" || order.order_type === "permanent") && order.recurring_start_date && (
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                      {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {feedback && (
                    <div className="flex items-center text-warning">
                      <StarIcon className="h-4 w-4 fill-current" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <RecordDetailsDialog record={order} title={`Details zu Auftrag: ${order.title}`} />
                    <OrderEditDialog order={order} />
                    <DeleteOrderButton orderId={order.id} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}