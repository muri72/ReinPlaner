"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Clock, FileText, Wrench, UserRound, AlertTriangle, Star as StarIcon, PlusCircle, Briefcase, FileStack } from "lucide-react";
import { deleteOrder, createOrder } from "./actions";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { SearchInput } from "@/components/search-input";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { OrdersTableView } from "@/components/orders-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { AssignedEmployee } from "@/components/order-form";

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

export interface DisplayOrder {
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
  // Derived for display
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  // Full assignment data
  assignedEmployees: AssignedEmployee[];
  order_feedback: {
    id: string;
    rating: number;
    comment: string | null;
    image_urls: string[] | null;
    created_at: string;
  }[];
  // Nested objects for easier access in components
  object: { name: string | null; address: string | null; notes: string | null; } | null;
  customer: { name: string | null; } | null;
  customer_contact: { first_name: string | null; last_name: string | null; phone: string | null; } | null;
  // Add fields for employee dashboard compatibility
  assigned_daily_hours: (number | null)[] | null;
  assigned_monday_hours: number | null;
  assigned_tuesday_hours: number | null;
  assigned_wednesday_hours: number | null;
  assigned_thursday_hours: number | null;
  assigned_friday_hours: number | null;
  assigned_saturday_hours: number | null;
  assigned_sunday_hours: number | null;
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
}

const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

export default function OrdersPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [allOrders, setAllOrders] = useState<DisplayOrder[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = (currentSearchParams.get('query') || '') as string;
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const statusFilter = (currentSearchParams.get('status') || '') as string;
  const orderTypeFilter = (currentSearchParams.get('orderType') || '') as string;
  const serviceTypeFilter = (currentSearchParams.get('serviceType') || '') as string;
  const customerIdFilter = (currentSearchParams.get('customerId') || '') as string;
  const employeeIdFilter = (currentSearchParams.get('employeeId') || '') as string;
  const viewMode = (currentSearchParams.get('viewMode') || 'grid') as string;
  const sortColumn = (currentSearchParams.get('sortColumn') || 'created_at') as string;
  const sortDirection = (currentSearchParams.get('sortDirection') || 'desc') as string;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
    }
    const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
    setCurrentUserRole(role);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
    const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });

    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);

    setCustomers(customersData || []);
    setEmployees(employeesData || []);

    let ordersData: DisplayOrder[] = [];
    let ordersError: any = null;
    let ordersCount: number | null = 0;

    let filterUserId: string | null = null;
    let filterCustomerId: string | null = null;

    if (role === 'employee' || role === 'manager') {
      filterUserId = user.id;
    } else if (role === 'customer') {
      const { data: customerData, error: customerDataError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (customerDataError && customerDataError.code !== 'PGRST116') {
        console.error("Error fetching customer ID for user:", customerDataError);
      }
      filterCustomerId = customerData?.id || null;
    }

    if (query) {
      const { data, error: rpcError } = await supabase.rpc('search_orders', {
        search_query: query,
        filter_user_id: filterUserId,
        filter_customer_id: filterCustomerId
      });
      ordersData = (data as DisplayOrder[] | null)?.map(o => ({ ...o, order_feedback: [] })) || [];
      ordersError = rpcError;
      ordersCount = ordersData.length;
    } else {
      let selectQuery = supabase
        .from('orders')
        .select(`
          id,
          user_id,
          title,
          description,
          status,
          due_date,
          created_at,
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
          objects ( name, address, notes, time_of_day, access_method, pin, is_alarm_secured, alarm_password, security_code_word, total_weekly_hours ),
          customer_contacts ( first_name, last_name, phone ),
          order_feedback ( id, rating, comment, image_urls, created_at ),
          order_employee_assignments ( 
            employee_id, 
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
        `, { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });

      if (statusFilter) {
        selectQuery = selectQuery.eq('status', statusFilter);
      }
      if (orderTypeFilter) {
        selectQuery = selectQuery.eq('order_type', orderTypeFilter);
      }
      if (serviceTypeFilter) {
        selectQuery = selectQuery.eq('service_type', serviceTypeFilter);
      }
      if (customerIdFilter) {
        selectQuery = selectQuery.eq('customer_id', customerIdFilter);
      }
      if (employeeIdFilter) {
        selectQuery = selectQuery.eq('order_employee_assignments.employee_id', employeeIdFilter);
      }

      const { data, error: selectError, count: selectCount } = await selectQuery
        .range(from, to);

      ordersData = data?.map(order => {
        const customerData = Array.isArray(order.customers) ? order.customers[0] : order.customers;
        const objectData = Array.isArray(order.objects) ? order.objects[0] : order.objects;
        const customerContactData = Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts;

        const mappedAssignments = order.order_employee_assignments?.map((a: any) => ({
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
          user_id: order.user_id,
          title: order.title,
          description: order.description,
          status: order.status,
          due_date: order.due_date,
          created_at: order.created_at,
          customer_id: order.customer_id,
          object_id: order.object_id,
          customer_contact_id: order.customer_contact_id,
          order_type: order.order_type,
          recurring_start_date: order.recurring_start_date,
          recurring_end_date: order.recurring_end_date,
          priority: order.priority,
          total_estimated_hours: order.total_estimated_hours,
          notes: order.notes,
          request_status: order.request_status,
          service_type: order.service_type,
          order_feedback: order.order_feedback,
          customer_name: customerData?.name || null,
          object_name: objectData?.name || null,
          customer_contact_first_name: customerContactData?.first_name || null,
          customer_contact_last_name: customerContactData?.last_name || null,
          employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
          employee_first_names: order.order_employee_assignments?.map((a: any) => a.employees?.first_name || '') || null,
          employee_last_names: order.order_employee_assignments?.map((a: any) => a.employees?.last_name || '') || null,
          assignedEmployees: mappedAssignments,
          object: objectData,
          customer: customerData,
          customer_contact: customerContactData,
        } as DisplayOrder;
      }) || [];
      ordersError = selectError;
      ordersCount = selectCount;
    }

    if (ordersError) {
      console.error("Fehler beim Laden der Aufträge:", ordersError?.message || ordersError);
    }
    setAllOrders(ordersData);
    setTotalCount(ordersCount);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    statusFilter,
    orderTypeFilter,
    serviceTypeFilter,
    customerIdFilter,
    employeeIdFilter,
    sortColumn,
    sortDirection,
    currentSearchParams
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const pendingRequests = allOrders.filter(order => order.request_status === 'pending');
  const otherOrders = allOrders.filter(order => order.request_status !== 'pending');

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

  const orderStatusOptions = [
    { value: 'pending', label: 'Ausstehend' },
    { value: 'in_progress', label: 'In Bearbeitung' },
    { value: 'completed', label: 'Abgeschlossen' },
  ];

  const orderTypeOptions = [
    { value: 'one_time', label: 'Einmalig' },
    { value: 'recurring', label: 'Wiederkehrend' },
    { value: 'substitution', label: 'Vertretung' },
    { value: 'permanent', label: 'Permanent' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
      <h1 className="text-2xl md:text-3xl font-bold">Auftragsverwaltung</h1>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Aufträge suchen..." />
        <OrderCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <FilterSelect
            paramName="status"
            label="Status"
            options={orderStatusOptions}
            currentValue={statusFilter}
          />
          <FilterSelect
            paramName="orderType"
            label="Auftragstyp"
            options={orderTypeOptions}
            currentValue={orderTypeFilter}
          />
          <FilterSelect
            paramName="serviceType"
            label="Dienstleistung"
            options={availableServices.map(s => ({ value: s, label: s }))}
            currentValue={serviceTypeFilter}
          />
          <FilterSelect
            paramName="customerId"
            label="Kunde"
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            currentValue={customerIdFilter}
          />
          <FilterSelect
            paramName="employeeId"
            label="Mitarbeiter"
            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
            currentValue={employeeIdFilter}
          />
        </div>
      </Suspense>

      {/* Section for Pending Requests */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 md:h-6 md:w-6 text-warning" />
          Offene Anfragen ({pendingRequests.length})
        </h2>
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-0">
            {pendingRequests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine offenen Auftragsanfragen</p>
                <p className="text-sm">Alle Anfragen wurden bearbeitet oder es gibt keine neuen.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left [&amp;:has([data-selected])]:bg-accent [&amp;_th]:first:rounded-tl-md [&amp;_th]:last:rounded-tr-md [&amp;_th]:last:text-right">
                      <th className="h-12 px-4 text-base font-semibold min-w-[150px]">Auftrag</th>
                      <th className="h-12 px-4 text-base font-semibold min-w-[120px]">Kunde</th>
                      <th className="h-12 px-4 text-base font-semibold min-w-[120px]">Objekt</th>
                      <th className="h-12 px-4 text-base font-semibold min-w-[100px]">Dienstleistung</th>
                      <th className="h-12 px-4 text-base font-semibold min-w-[100px]">Anfrage Status</th>
                      <th className="h-12 px-4 text-base font-semibold min-w-[120px]">Zeitraum</th>
                      <th className="h-12 px-4 text-base font-semibold text-right min-w-[120px]">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((order) => (
                      <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle font-medium text-sm">{order.title}</td>
                        <td className="p-4 align-middle text-sm">{order.customer_name || 'N/A'}</td>
                        <td className="p-4 align-middle text-sm">{order.object_name || 'N/A'}</td>
                        <td className="p-4 align-middle text-sm">{order.service_type || 'N/A'}</td>
                        <td className="p-4 align-middle">
                          <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>{order.request_status}</Badge>
                        </td>
                        <td className="p-4 align-middle text-sm">
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
                        </td>
                        <td className="p-4 align-middle text-right">
                          <RecordDetailsDialog record={order} title={`Details zu Auftrag: ${order.title}`} />
                          <OrderPlanningDialog order={order} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section for Other Orders with View Toggle */}
      <div className="space-y-4 pt-8">
        <h2 className="text-xl md:text-2xl font-bold">Bestehende Aufträge</h2>
        {query && (
          <p className="text-sm text-muted-foreground mb-4">
            Hinweis: Bei aktiver Suche wird die Paginierung deaktiviert und alle passenden Ergebnisse angezeigt.
          </p>
        )}
        <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
          <div className="flex justify-end mb-4">
            <TabsList className="hidden md:grid grid-cols-2 w-fit">
              <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
              <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="grid" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {otherOrders.length === 0 && !query && !statusFilter && !orderTypeFilter && !serviceTypeFilter && !customerIdFilter && !employeeIdFilter ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Noch keine Aufträge vorhanden</p>
                  <p className="text-sm">Beginnen Sie, indem Sie einen neuen Auftrag hinzufügen.</p>
                </div>
              ) : otherOrders.length === 0 && (query || statusFilter || orderTypeFilter || serviceTypeFilter || customerIdFilter || employeeIdFilter) ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
                  <p className="text-sm">Ihre Filter ergaben keine Treffer.</p>
                </div>
              ) : (
                otherOrders.map((order) => {
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
                          <DeleteOrderButton orderId={order.id} onDeleteSuccess={fetchData} />
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
                            
                            {/* Display assigned times for each day */}
                            {dayNames.map(day => {
                                const assignmentsForDay = order.assignedEmployees
                                    ?.map(emp => {
                                        const startTime = (emp as any)[`assigned_${day}_start_time`];
                                        const endTime = (emp as any)[`assigned_${day}_end_time`];
                                        if (startTime && endTime) {
                                            const employee = employees.find(e => e.id === emp.employeeId);
                                            const empName = employee ? `${employee.first_name?.charAt(0)}.` : '??';
                                            return `${empName}: ${startTime}-${endTime}`;
                                        }
                                        return null;
                                    })
                                    .filter(Boolean);

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
                            <DocumentUploader associatedOrderId={order.id} onDocumentUploaded={() => { /* Re-fetch documents if needed */ }} />
                            <DocumentList associatedOrderId={order.id} />
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
          <TabsContent value="table" className="mt-0">
            <OrdersTableView
              orders={otherOrders}
              totalPages={totalPages}
              currentPage={currentPage}
              query={query}
              statusFilter={statusFilter}
              orderTypeFilter={orderTypeFilter}
              serviceTypeFilter={serviceTypeFilter}
              customerIdFilter={customerIdFilter}
              employeeIdFilter={employeeIdFilter}
              customers={customers}
              employees={employees}
              availableServices={availableServices}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
            />
          </TabsContent>
        </Tabs>
        {!query && totalPages > 1 && (
          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}