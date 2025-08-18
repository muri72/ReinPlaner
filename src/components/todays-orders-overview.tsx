"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { Briefcase, CalendarDays, Clock, UserRound, Building, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DisplayOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  customer_id: string | null;
  object_id: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  assigned_daily_hours: (number | null)[] | null; // Keep for compatibility if needed elsewhere
  assigned_monday_hours: number | null;
  assigned_tuesday_hours: number | null;
  assigned_wednesday_hours: number | null;
  assigned_thursday_hours: number | null;
  assigned_friday_hours: number | null;
  assigned_saturday_hours: number | null;
  assigned_sunday_hours: number | null;
  // New time fields
  assigned_monday_start_time: string | null;
  assigned_monday_end_time: string | null;
  assigned_tuesday_start_time: string | null;
  assigned_tuesday_end_time: string | null;
  assigned_wednesday_start_time: string | null;
  assigned_wednesday_end_time: string | null;
  assigned_thursday_start_time: string | null;
  assigned_thursday_end_time: string | null;
  assigned_friday_start_time: string | null;
  assigned_friday_end_time: string | null;
  assigned_saturday_start_time: string | null;
  assigned_saturday_end_time: string | null;
  assigned_sunday_start_time: string | null;
  assigned_sunday_end_time: string | null;
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
}

export function TodaysOrdersOverview() {
  const supabase = createClient();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaysOrders = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      if (!currentUserId) {
        toast.error("Benutzer nicht authentifiziert.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single();

      if (profileError) {
        console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
        toast.error("Fehler beim Laden der Benutzerberechtigungen.");
        setLoading(false);
        return;
      }

      const currentUserRole = profileData?.role || 'employee';
      let currentEmployeeId: string | null = null;

      if (currentUserRole === 'employee') {
        const { data: employeeData, error: employeeDataError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', currentUserId)
          .single();

        if (employeeDataError && employeeDataError.code !== 'PGRST116') {
          console.error("Fehler beim Laden der Mitarbeiter-ID:", employeeDataError?.message || employeeDataError);
          toast.error("Fehler beim Laden Ihrer Mitarbeiterdaten.");
          setLoading(false);
          return;
        }
        currentEmployeeId = employeeData?.id || null;
      }


      let query = supabase
        .from('orders')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          customer_id,
          object_id,
          customer_contact_id,
          order_type,
          recurring_start_date,
          recurring_end_date,
          priority,
          total_estimated_hours,
          notes,
          request_status,
          service_type,
          customers ( name ),
          objects ( name ),
          customer_contacts ( first_name, last_name ),
          order_employee_assignments ( 
            employee_id, 
            assigned_daily_hours,
            assigned_monday_hours, assigned_tuesday_hours, assigned_wednesday_hours,
            assigned_thursday_hours, assigned_friday_hours, assigned_saturday_hours,
            assigned_sunday_hours,
            assigned_monday_start_time, assigned_monday_end_time,
            assigned_tuesday_start_time, assigned_tuesday_end_time,
            assigned_wednesday_start_time, assigned_wednesday_end_time,
            assigned_thursday_start_time, assigned_thursday_end_time,
            assigned_friday_start_time, assigned_friday_end_time,
            assigned_saturday_start_time, assigned_saturday_end_time,
            assigned_sunday_start_time, assigned_sunday_end_time,
            employees ( first_name, last_name ) 
          )
        `)
        .eq('request_status', 'approved')
        .order('due_date', { ascending: true })
        .order('recurring_start_date', { ascending: true });

      query = query.or(
        `due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`
      );

      const { data, error } = await query;

      if (error) {
        console.error("Fehler beim Laden der heutigen Aufträge:", error?.message || error);
        toast.error("Fehler beim Laden der heutigen Aufträge.");
        setOrders([]);
      } else {
        const mappedOrders = data.map(order => {
          const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
          const object = Array.isArray(order.objects) ? order.objects[0] : order.objects;
          const customerContact = Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts;
          const assignedEmployeeData = order.order_employee_assignments?.[0]; // Assuming one assignment for simplicity in mapping

          return {
            id: order.id,
            title: order.title,
            description: order.description,
            status: order.status,
            due_date: order.due_date,
            customer_id: order.customer_id,
            object_id: order.object_id,
            employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
            employee_first_names: order.order_employee_assignments?.map((a: any) => a.employees?.first_name || '') || null,
            employee_last_names: order.order_employee_assignments?.map((a: any) => a.employees?.last_name || '') || null,
            assigned_daily_hours: order.order_employee_assignments?.map((a: any) => a.assigned_daily_hours) || null,
            assigned_monday_hours: assignedEmployeeData?.assigned_monday_hours || null,
            assigned_tuesday_hours: assignedEmployeeData?.assigned_tuesday_hours || null,
            assigned_wednesday_hours: assignedEmployeeData?.assigned_wednesday_hours || null,
            assigned_thursday_hours: assignedEmployeeData?.assigned_thursday_hours || null,
            assigned_friday_hours: assignedEmployeeData?.assigned_friday_hours || null,
            assigned_saturday_hours: assignedEmployeeData?.assigned_saturday_hours || null,
            assigned_sunday_hours: assignedEmployeeData?.assigned_sunday_hours || null,
            // New time fields
            assigned_monday_start_time: assignedEmployeeData?.assigned_monday_start_time || null,
            assigned_monday_end_time: assignedEmployeeData?.assigned_monday_end_time || null,
            assigned_tuesday_start_time: assignedEmployeeData?.assigned_tuesday_start_time || null,
            assigned_tuesday_end_time: assignedEmployeeData?.assigned_tuesday_end_time || null,
            assigned_wednesday_start_time: assignedEmployeeData?.assigned_wednesday_start_time || null,
            assigned_wednesday_end_time: assignedEmployeeData?.assigned_wednesday_end_time || null,
            assigned_thursday_start_time: assignedEmployeeData?.assigned_thursday_start_time || null,
            assigned_thursday_end_time: assignedEmployeeData?.assigned_thursday_end_time || null,
            assigned_friday_start_time: assignedEmployeeData?.assigned_friday_start_time || null,
            assigned_friday_end_time: assignedEmployeeData?.assigned_friday_end_time || null,
            assigned_saturday_start_time: assignedEmployeeData?.assigned_saturday_start_time || null,
            assigned_saturday_end_time: assignedEmployeeData?.assigned_saturday_end_time || null,
            assigned_sunday_start_time: assignedEmployeeData?.assigned_sunday_start_time || null,
            assigned_sunday_end_time: assignedEmployeeData?.assigned_sunday_end_time || null,
            customer_contact_id: order.customer_contact_id,
            customer_name: customer?.name || null,
            object_name: object?.name || null,
            customer_contact_first_name: customerContact?.first_name || null,
            customer_contact_last_name: customerContact?.last_name || null,
            order_type: order.order_type,
            recurring_start_date: order.recurring_start_date,
            recurring_end_date: order.recurring_end_date,
            priority: order.priority,
            total_estimated_hours: order.total_estimated_hours,
            notes: order.notes,
            request_status: order.request_status,
            service_type: order.service_type,
          };
        });

        const filteredByRole = mappedOrders.filter(order => {
          if (currentUserRole === 'admin') return true;
          if (currentUserRole === 'employee') {
            return order.employee_ids?.includes(currentEmployeeId || '') || false;
          }
          if (currentUserRole === 'manager') {
            return true;
          }
          if (currentUserRole === 'customer') {
            return true;
          }
          return false;
        });

        setOrders(filteredByRole);
      }
      setLoading(false);
    };

    fetchTodaysOrders();
  }, [supabase]);

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

  const getAssignedTimeForToday = (order: DisplayOrder) => {
    const todayDayOfWeek = new Date().getDay(); // 0=So, 1=Mo, ..., 6=Sa
    const dayMap: { [key: number]: { start: keyof DisplayOrder, end: keyof DisplayOrder } } = {
      0: { start: 'assigned_sunday_start_time', end: 'assigned_sunday_end_time' },
      1: { start: 'assigned_monday_start_time', end: 'assigned_monday_end_time' },
      2: { start: 'assigned_tuesday_start_time', end: 'assigned_tuesday_end_time' },
      3: { start: 'assigned_wednesday_start_time', end: 'assigned_wednesday_end_time' },
      4: { start: 'assigned_thursday_start_time', end: 'assigned_thursday_end_time' },
      5: { start: 'assigned_friday_start_time', end: 'assigned_friday_end_time' },
      6: { start: 'assigned_saturday_start_time', end: 'assigned_saturday_end_time' },
    };
    const startKey = dayMap[todayDayOfWeek]?.start;
    const endKey = dayMap[todayDayOfWeek]?.end;

    const startTime = startKey ? (order[startKey] as string | null) : null;
    const endTime = endKey ? (order[endKey] as string | null) : null;

    if (startTime && endTime) {
      return `${startTime} - ${endTime}`;
    }
    return 'N/A';
  };

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Briefcase className="mr-2 h-5 w-5" /> Heutige Einsätze
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p className="text-base font-semibold">Keine Einsätze für heute geplant.</p>
            <p className="text-sm">Zeit für eine Tasse Kaffee!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Auftrag</TableHead>
                  <TableHead className="min-w-[120px]">Kunde / Objekt</TableHead>
                  <TableHead className="min-w-[120px]">Mitarbeiter</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Priorität</TableHead>
                  <TableHead className="min-w-[100px]">Typ</TableHead>
                  <TableHead className="min-w-[120px]">Zeitraum</TableHead>
                  <TableHead className="min-w-[120px]">Zugewiesene Zeit</TableHead> {/* New column */}
                  <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const employeeNames = (order.employee_first_names && order.employee_last_names)
                    ? order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')
                    : 'N/A';
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">{order.title}</TableCell>
                      <TableCell>
                        <p className="text-sm">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.object_name}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {employeeNames}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(order.priority)}>{order.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.order_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.order_type === "one_time" && order.due_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-1 h-3 w-3" />
                            {format(new Date(order.due_date), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        )}
                        {(order.order_type === "recurring" || order.order_type === "permanent" || order.order_type === "substitution") && order.recurring_start_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-1 h-3 w-3" />
                            {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                            {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getAssignedTimeForToday(order)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <OrderEditDialog order={order} />
                          {order.request_status === 'pending' && (
                            <OrderPlanningDialog order={order} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}