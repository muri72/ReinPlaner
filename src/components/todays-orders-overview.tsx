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
  employee_ids: string[] | null; // Updated to array of IDs
  employee_first_names: string[] | null; // Updated to array of first names
  employee_last_names: string[] | null; // Updated to array of last names
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
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
}

export function TodaysOrdersOverview() {
  const supabase = createClient();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaysOrders = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      if (!currentUserId) {
        toast.error("Benutzer nicht authentifiziert.");
        setLoading(false);
        return;
      }

      // Fetch user role
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

      // If the user is an employee, fetch their employee_id separately
      if (currentUserRole === 'employee') {
        const { data: employeeData, error: employeeDataError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', currentUserId)
          .single();

        if (employeeDataError && employeeDataError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine if no employee profile
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
          estimated_hours,
          notes,
          request_status,
          service_type,
          customers ( name ),
          objects ( name ),
          customer_contacts ( first_name, last_name ),
          order_employee_assignments ( employee_id, employees ( first_name, last_name ) )
        `)
        .eq('request_status', 'approved') // Only show approved orders
        .order('due_date', { ascending: true })
        .order('recurring_start_date', { ascending: true });

      // Filter by date for one-time orders OR recurring/permanent/substitution orders
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
            customer_contact_id: order.customer_contact_id,
            customer_name: customer?.name || null,
            object_name: object?.name || null,
            customer_contact_first_name: customerContact?.first_name || null,
            customer_contact_last_name: customerContact?.last_name || null,
            order_type: order.order_type,
            recurring_start_date: order.recurring_start_date,
            recurring_end_date: order.recurring_end_date,
            priority: order.priority,
            estimated_hours: order.estimated_hours,
            notes: order.notes,
            request_status: order.request_status,
            service_type: order.service_type,
          };
        });

        // Filter based on user role (RLS should handle most of this, but for client-side display consistency)
        const filteredByRole = mappedOrders.filter(order => {
          if (currentUserRole === 'admin') return true;
          if (currentUserRole === 'employee') {
            // Check if any of the assigned employee IDs match the current employee's ID
            return order.employee_ids?.includes(currentEmployeeId || '') || false;
          }
          if (currentUserRole === 'manager') {
            // Managers can see orders for customers they are assigned to
            // This would require fetching manager_customer_assignments and filtering
            // For now, let's assume RLS handles this for managers.
            return true;
          }
          if (currentUserRole === 'customer') {
            // Customers can see orders for their customer_id or customer_contact_id
            // This would require fetching customer_id/customer_contact_id for the user
            // For now, let's assume RLS handles this for customers.
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
                        {(order.order_type === "recurring" || order.order_type === "substitution" || order.order_type === "permanent") && order.recurring_start_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-1 h-3 w-3" />
                            {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                            {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                          </div>
                        )}
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