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
import { TodaysOrdersOverview } from "@/components/todays-orders-overview"; // Reuse for today's orders

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

  if (profileError) { // Added error logging for profile fetching
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'employee') {
    redirect("/dashboard"); // Ensure only employees access this page
  }

  const employeeName = profile?.first_name || user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch employee's associated employee_id
  const { data: employeeData, error: employeeDataError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (employeeDataError && employeeDataError.code !== 'PGRST116') {
    console.error("Fehler beim Laden der Mitarbeiterdaten:", employeeDataError?.message || JSON.stringify(employeeDataError));
  }

  const employeeId = employeeData?.id || null;

  // Fetch today's assigned orders for the employee
  let todaysAssignedOrders: any[] = [];
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
        objects ( name, address, notes, time_of_day, access_method, pin, is_alarm_secured, alarm_password, security_code_word ),
        customers ( name ),
        customer_contacts ( first_name, last_name, phone ),
        order_employee_assignments!inner ( 
          employee_id, 
          assigned_daily_hours,
          assigned_monday_hours,
          assigned_tuesday_hours,
          assigned_wednesday_hours,
          assigned_thursday_hours,
          assigned_friday_hours,
          assigned_saturday_hours,
          assigned_sunday_hours
        )
      `)
      .eq('order_employee_assignments.employee_id', employeeId) // Filter by assignment table
      .eq('request_status', 'approved')
      .or(
        `due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`
      )
      .order('due_date', { ascending: true })
      .order('recurring_start_date', { ascending: true });

    if (ordersError) {
      console.error("Fehler beim Laden der heutigen Aufträge für Mitarbeiter:", ordersError?.message || JSON.stringify(ordersError));
    } else {
      todaysAssignedOrders = orders.map(order => ({
        ...order,
        object: Array.isArray(order.objects) ? order.objects[0] : order.objects,
        customer: Array.isArray(order.customers) ? order.customers[0] : order.customers,
        customer_contact: Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts,
        // Extract assigned_daily_hours from the assignment
        assigned_daily_hours: order.order_employee_assignments?.[0]?.assigned_daily_hours || null,
        assigned_monday_hours: order.order_employee_assignments?.[0]?.assigned_monday_hours || null,
        assigned_tuesday_hours: order.order_employee_assignments?.[0]?.assigned_tuesday_hours || null,
        assigned_wednesday_hours: order.order_employee_assignments?.[0]?.assigned_wednesday_hours || null,
        assigned_thursday_hours: order.order_employee_assignments?.[0]?.assigned_thursday_hours || null,
        assigned_friday_hours: order.order_employee_assignments?.[0]?.assigned_friday_hours || null,
        assigned_saturday_hours: order.order_employee_assignments?.[0]?.assigned_saturday_hours || null,
        assigned_sunday_hours: order.order_employee_assignments?.[0]?.assigned_sunday_hours || null,
      }));
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
              {todaysAssignedOrders.map(order => (
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
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.object.address)}`} target="_blank" rel="noopener noreferrer">
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
                    {order.object?.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Objekt-Hinweise: {order.object.notes}</span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Auftrags-Notizen: {order.notes}</span>
                      </div>
                    )}
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