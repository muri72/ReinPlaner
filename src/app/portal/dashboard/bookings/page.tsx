import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CalendarDays, Building, Wrench, FileText, Clock } from "lucide-react";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog";
import { OrderFeedbackDialog } from "@/components/order-feedback-dialog"; // For giving feedback on completed orders

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
  assigned_daily_hours: (number | null)[] | null; // Hinzugefügt
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null; // Corrected column name
  notes: string | null;
  request_status: string;
  service_type: string | null;
  order_feedback: { id: string }[]; // To check if feedback exists
}

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'customer') {
    redirect("/dashboard");
  }

  const customerIdResult = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const customerId = customerIdResult.data?.id || null;

  let allCustomerOrders: DisplayOrder[] = [];
  if (customerId) {
    const { data, error } = await supabase
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
        request_status,
        service_type,
        objects ( name ),
        customers ( name ),
        customer_contacts ( first_name, last_name ),
        order_feedback ( id ),
        order_employee_assignments ( employee_id, assigned_daily_hours, employees ( first_name, last_name ) )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Kundenaufträge:", error?.message || JSON.stringify(error));
    } else {
      allCustomerOrders = data.map(order => ({
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
        customer_contact_id: order.customer_contact_id,
        customer_name: order.customers?.[0]?.name || null,
        object_name: order.objects?.[0]?.name || null,
        customer_contact_first_name: order.customer_contacts?.[0]?.first_name || null,
        customer_contact_last_name: order.customer_contacts?.[0]?.last_name || null,
        order_type: order.order_type,
        recurring_start_date: order.recurring_start_date,
        recurring_end_date: order.recurring_end_date,
        priority: order.priority,
        total_estimated_hours: order.total_estimated_hours,
        notes: order.notes,
        request_status: order.request_status,
        service_type: order.service_type,
        order_feedback: order.order_feedback,
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

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Buchungen</h1>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Neue Buchung anfragen</CardTitle>
        </CardHeader>
        <CardContent>
          {customerId ? (
            <CustomerOrderRequestDialog customerId={customerId} />
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              Ihre Kunden-ID konnte nicht geladen werden. Bitte kontaktieren Sie den Support.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Übersicht Ihrer Buchungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allCustomerOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Keine Buchungen gefunden</p>
              <p className="text-sm">Sie haben noch keine Buchungen vorgenommen.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Auftrag</TableHead>
                    <TableHead className="min-w-[120px]">Objekt</TableHead>
                    <TableHead className="min-w-[100px]">Dienstleistung</TableHead>
                    <TableHead className="min-w-[100px]">Typ</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Zeitraum</TableHead>
                    <TableHead className="min-w-[120px]">Anfrage Status</TableHead>
                    <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomerOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">{order.title}</TableCell>
                      <TableCell className="text-sm">{order.object_name || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell>
                      <TableCell><Badge variant="outline">{order.order_type}</Badge></TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
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
                      <TableCell><Badge variant={getRequestStatusBadgeVariant(order.request_status)}>{order.request_status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          {order.status === 'completed' && order.order_feedback.length === 0 && (
                            <OrderFeedbackDialog orderId={order.id} />
                          )}
                          <Button variant="ghost" size="icon" title="Details anzeigen">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}