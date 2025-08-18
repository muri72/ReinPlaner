import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, MapPin, UserRound, Clock, FileText, CheckCircle2, AlertCircle, Wrench, ListChecks, MessageSquare } from "lucide-react";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import type { DisplayOrder } from '@/app/dashboard/orders/page'; // Import DisplayOrder
import { AssignedEmployee } from "@/components/order-form";

// Define an interface for the raw data returned by Supabase select query for employee dashboard
interface RawEmployeeOrderResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  service_type: string | null;
  request_status: string;
  objects: { name: string | null; address: string | null; notes: string | null; time_of_day: string | null; access_method: string | null; pin: string | null; is_alarm_secured: boolean | null; alarm_password: string | null; security_code_word: string | null; total_weekly_hours: number | null; }[] | null;
  customers: { name: string | null; }[] | null;
  customer_contacts: { first_name: string | null; last_name: string | null; phone: string | null; }[] | null;
  order_employee_assignments: { 
    employee_id: string; 
    assigned_daily_hours: number | null;
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
    employees: { first_name: string | null; last_name: string | null }[] | null; // Correctly typed as array
  }[] | null;
}

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'employee') {
    redirect("/dashboard");
  }

  const employeeName = profile?.first_name || user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: employeeData, error: employeeDataError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (employeeDataError && employeeDataError.code !== 'PGRST116') {
    console.error("Fehler beim Laden der Mitarbeiterdaten:", employeeDataError?.message || JSON.stringify(employeeDataError));
  }

  const employeeId = employeeData?.id || null;

  let todaysAssignedOrders: DisplayOrder[] = []; // Explicitly type as DisplayOrder[]
  if (employeeId) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        description,
        status,
        due_date,
        order_type,
        recurring_start_date,
        recurring_end_date,
        priority,
        total_estimated_hours,
        notes,
        service_type,
        request_status,
        objects ( name, address, notes, time_of_day, access_method, pin, is_alarm_secured, alarm_password, security_code_word, total_weekly_hours ),
        customers ( name ),
        customer_contacts ( first_name, last_name, phone ),
        order_employee_assignments!inner ( 
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
      .eq('order_employee_assignments.employee_id', employeeId)
      .eq('request_status', 'approved')
      .or(
        `due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`
      )
      .order('due_date', { ascending: true })
      .order('recurring_start_date', { ascending: true });

    if (ordersError) {
      console.error("Fehler beim Laden der heutigen Aufträge für Mitarbeiter:", ordersError?.message || JSON.stringify(ordersError));
    } else {
      todaysAssignedOrders = orders.map((order: RawEmployeeOrderResponse) => {
        const assignedEmployeeData = order.order_employee_assignments?.[0];
        const customerData = order.customers?.[0];
        const objectData = order.objects?.[0];
        const customerContactData = order.customer_contacts?.[0];

        const mappedAssignments: AssignedEmployee[] = order.order_employee_assignments?.map((a: any) => ({
            employeeId: a.employee_id,
            assigned_monday_hours: a.assigned_monday_hours,
            assigned_tuesday_hours: a.assigned_tuesday_hours,
            assigned_wednesday_hours: a.assigned_wednesday_hours,
            assigned_thursday_hours: a.assigned_thursday_hours,
            assigned_friday_hours: a.assigned_friday_hours,
            assigned_saturday_hours: a.assigned_saturday_hours,
            assigned_sunday_hours: a.assigned_sunday_hours,
            assigned_monday_start_time: a.assigned_monday_start_time,
            assigned_monday_end_time: a.assigned_monday_end_time,
            assigned_tuesday_start_time: a.assigned_tuesday_start_time,
            assigned_tuesday_end_time: a.assigned_tuesday_end_time,
            assigned_wednesday_start_time: a.assigned_wednesday_start_time,
            assigned_wednesday_end_time: a.assigned_wednesday_end_time,
            assigned_thursday_start_time: a.assigned_thursday_start_time,
            assigned_thursday_end_time: a.assigned_thursday_end_time,
            assigned_friday_start_time: a.assigned_friday_start_time,
            assigned_friday_end_time: a.assigned_friday_end_time,
            assigned_saturday_start_time: a.assigned_saturday_start_time,
            assigned_saturday_end_time: a.assigned_saturday_end_time,
            assigned_sunday_start_time: a.assigned_sunday_start_time,
            assigned_sunday_end_time: a.assigned_sunday_end_time,
        })) || [];

        return {
          id: order.id,
          user_id: user.id, // Assuming user_id is current user's ID for employee's orders
          title: order.title,
          description: order.description,
          status: order.status,
          due_date: order.due_date,
          created_at: null, // Not selected in query, set to null
          customer_id: null, // Not selected in query, set to null
          object_id: null, // Not selected in query, set to null
          employee_ids: order.order_employee_assignments?.map(a => a.employee_id) || null,
          employee_first_names: order.order_employee_assignments?.map(a => a.employees?.[0]?.first_name || '') || null, // Access first element of employees array
          employee_last_names: order.order_employee_assignments?.map(a => a.employees?.[0]?.last_name || '') || null, // Access first element of employees array
          assignedEmployees: mappedAssignments,
          customer_contact_id: null, // Not selected in query, set to null
          customer_name: customerData?.name || null,
          object_name: objectData?.name || null,
          customer_contact_first_name: customerContactData?.first_name || null,
          customer_contact_last_name: customerContactData?.last_name || null,
          order_type: order.order_type,
          recurring_start_date: order.recurring_start_date,
          recurring_end_date: order.recurring_end_date,
          priority: order.priority,
          total_estimated_hours: order.total_estimated_hours,
          notes: order.notes,
          request_status: order.request_status,
          service_type: order.service_type,
          order_feedback: [], // Not selected in query, set to empty array
          object: objectData ?? null, // Assign the nested object, convert undefined to null
          customer: customerData ?? null, // Assign the nested customer, convert undefined to null
          customer_contact: customerContactData ?? null, // Assign the nested customer_contact, convert undefined to null
        } as DisplayOrder;
      });
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  const getAssignedTimeForToday = (order: DisplayOrder) => {
    const todayDayOfWeek = today.getDay(); // 0=So, 1=Mo, ..., 6=Sa
    const assignedEmployee = order.assignedEmployees?.[0]; // Assuming one assignment for simplicity
    if (!assignedEmployee) return 'N/A';

    const dayMap: { [key: number]: { start: keyof AssignedEmployee, end: keyof AssignedEmployee } } = {
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

    const startTime = startKey ? (assignedEmployee[startKey] as string | null) : null;
    const endTime = endKey ? (assignedEmployee[endKey] as string | null) : null;

    if (startTime && endTime) {
      return `${startTime} - ${endTime}`;
    }
    return 'N/A';
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Hallo, {employeeName}!</h1>
      <p className="text-sm md:text-base text-muted-foreground">
        Ihr Tagesplan für heute, {format(today, 'EEEE, dd. MMMM yyyy', { locale: de })}.
      </p>

      {/* Check-in/Check-out */}
      <EmployeeTimeTracker userId={user.id} />

      {/* Tagesplan auf einen Blick */}
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Ihr Tagesplan
          </CardTitle>
          <CardDescription>Ihre zugewiesenen Aufträge für heute.</CardDescription>
        </CardHeader>
        <CardContent>
          {todaysAssignedOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-base font-semibold">Keine Aufträge für heute zugewiesen.</p>
              <p className="text-sm">Zeit für eine Tasse Kaffee!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysAssignedOrders.map((order: DisplayOrder) => (
                <Card key={order.id} className="shadow-elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span>{order.title}</span>
                      <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {order.object?.name} ({order.customer?.name})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {order.object?.address && (
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{order.object.address}</span>
                        <Button variant="link" size="sm" asChild className="ml-auto">
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.object.address!)}`} target="_blank" rel="noopener noreferrer">
                            Route
                          </a>
                        </Button>
                      </div>
                    )}
                    {order.customer_contact?.first_name && (
                      <div className="flex items-center">
                        <UserRound className="mr-2 h-4 w-4" />
                        <span>Ansprechpartner: {order.customer_contact.first_name} {order.customer_contact.last_name}</span>
                        {order.customer_contact.phone && (
                          <Button variant="link" size="sm" asChild className="ml-auto">
                            <a href={`tel:${order.customer_contact.phone}`}>Anrufen</a>
                          </Button>
                        )}
                      </div>
                    )}
                    {order.service_type && (
                      <div className="flex items-center">
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>Dienstleistung: {order.service_type}</span>
                      </div>
                    )}
                    {order.description && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Details: {order.description}</span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Auftrags-Notizen: {order.notes}</span>
                      </div>
                    )}
                    {order.object?.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Objekt-Hinweise: {order.object.notes}</span>
                      </div>
                    )}
                    {/* Display assigned daily hours for the current day */}
                    {(() => {
                      const todayDayOfWeek = today.getDay(); // 0=So, 1=Mo, ..., 6=Sa
                      const assignedEmployee = order.assignedEmployees?.[0];
                      if (!assignedEmployee) return null;
                      const dayMap: { [key: number]: keyof AssignedEmployee } = {
                        0: 'assigned_sunday_hours',
                        1: 'assigned_monday_hours',
                        2: 'assigned_tuesday_hours',
                        3: 'assigned_wednesday_hours',
                        4: 'assigned_thursday_hours',
                        5: 'assigned_friday_hours',
                        6: 'assigned_saturday_hours',
                      };
                      const assignedHoursToday = assignedEmployee[dayMap[todayDayOfWeek]] as number | null;
                      if (assignedHoursToday !== null && assignedHoursToday > 0) {
                        return (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Zugewiesene Stunden heute: {assignedHoursToday.toFixed(1)} Std.</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Display assigned start/end times for the current day */}
                    {(() => {
                      const assignedTime = getAssignedTimeForToday(order);
                      if (assignedTime !== 'N/A') {
                        return (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Zugewiesene Zeit heute: {assignedTime}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Material- & Aufgabenliste (Platzhalter) */}
                    <div className="flex items-center text-muted-foreground">
                      <ListChecks className="mr-2 h-4 w-4" />
                      <span>Material & Aufgaben: (Platzhalter)</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback an Zentrale */}
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" /> Feedback an Zentrale
          </CardTitle>
          <CardDescription>Melden Sie Probleme oder geben Sie allgemeines Feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          <GiveGeneralFeedbackDialog />
        </CardContent>
      </Card>
    </div>
  );
}