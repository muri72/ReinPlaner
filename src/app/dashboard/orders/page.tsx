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
import { format, getWeek } from "date-fns";
import { de } from "date-fns/locale";
import { OrdersTableView } from "@/components/orders-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { AssignedEmployee } from "@/components/order-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Ensure these are imported

const dayNamesArray = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const germanDayNames: { [key: string]: string } = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

interface DailySchedule {
  day_of_week: string;
  week_offset_in_cycle: number;
  hours: number;
  start_time: string;
  end_time: string;
}

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
  object: { name: string | null; address: string | null; notes: string | null; recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any; } | null; // Added daily_schedules
  customer: { name: string | null; } | null;
  customer_contact: { first_name: string | null; last_name: string | null; phone: string | null; } | null;
  // Add fields for employee dashboard compatibility (deprecated, but kept for type consistency)
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
  assigned_recurrence_interval_weeks: number | null;
  assigned_start_week_offset: number | null;
}

const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

// Helper to parse daily schedules from JSONB
const parseDailySchedules = (jsonb: any): DailySchedule[] => {
  if (!jsonb) return [];
  return Array.isArray(jsonb) ? jsonb : [];
};

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
          objects ( name, address, notes, time_of_day, access_method, pin, is_alarm_secured, alarm_password, security_code_word, recurrence_interval_weeks, start_week_offset, daily_schedules ),
          customer_contacts ( first_name, last_name, phone ),
          order_feedback ( id, rating, comment, image_urls, created_at ),
          order_employee_assignments ( 
            employee_id, 
            assigned_daily_schedules,
            assigned_recurrence_interval_weeks, assigned_start_week_offset,
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
            assigned_daily_schedules: JSON.stringify(a.assigned_daily_schedules),
            assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
            assigned_start_week_offset: a.assigned_start_week_offset,
        })) || [];
        
        const firstAssignment = order.order_employee_assignments?.[0];

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
          employee_first_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.first_name || '') || null,
          employee_last_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.last_name || '') || null,
          assignedEmployees: mappedAssignments,
          object: objectData,
          customer: customerData,
          customer_contact: customerContactData,
          assigned_daily_hours: null, // Deprecated
          assigned_monday_hours: null, // Deprecated
          assigned_tuesday_hours: null, // Deprecated
          assigned_wednesday_hours: null, // Deprecated
          assigned_thursday_hours: null, // Deprecated
          assigned_friday_hours: null, // Deprecated
          assigned_saturday_hours: null, // Deprecated
          assigned_sunday_hours: null, // Deprecated
          assigned_monday_start_time: null, // Deprecated
          assigned_monday_end_time: null, // Deprecated
          assigned_tuesday_start_time: null, // Deprecated
          assigned_tuesday_end_time: null, // Deprecated
          assigned_wednesday_start_time: null, // Deprecated
          assigned_wednesday_end_time: null, // Deprecated
          assigned_thursday_start_time: null, // Deprecated
          assigned_thursday_end_time: null, // Deprecated
          assigned_friday_start_time: null, // Deprecated
          assigned_friday_end_time: null, // Deprecated
          assigned_saturday_start_time: null, // Deprecated
          assigned_saturday_end_time: null, // Deprecated
          assigned_sunday_start_time: null, // Deprecated
          assigned_sunday_end_time: null, // Deprecated
          assigned_recurrence_interval_weeks: firstAssignment?.assigned_recurrence_interval_weeks || null,
          assigned_start_week_offset: firstAssignment?.assigned_start_week_offset || null,
        };
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
    currentSearchParams // Add currentSearchParams to dependency array
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null; // Render nothing or a global loading if user is not yet determined
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const statusOptions = [
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

  const serviceTypeOptions = availableServices.map(service => ({ value: service, label: service }));

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

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Aufträge</h1>

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
            options={statusOptions}
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
            options={serviceTypeOptions}
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

      <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList className="hidden md:grid grid-cols-2 w-fit">
            <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
            <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {allOrders.length === 0 && !query && !statusFilter && !orderTypeFilter && !serviceTypeFilter && !customerIdFilter && !employeeIdFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Aufträge vorhanden</p>
                <p className="text-sm">Beginnen Sie, indem Sie einen neuen Auftrag hinzufügen.</p>
                <div className="mt-4">
                  <OrderCreateDialog />
                </div>
              </div>
            ) : allOrders.length === 0 && (query || statusFilter || orderTypeFilter || serviceTypeFilter || customerIdFilter || employeeIdFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
                <p className="text-sm">Ihre Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allOrders.map((order) => {
                const employeeNames = (order.employee_first_names && order.employee_last_names)
                  ? order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')
                  : 'N/A';
                const assignedEmployee = order.assignedEmployees?.[0]; // Assuming one assignment for simplicity
                const orderStartDateForWeekCalc = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : new Date());
                const startWeekNumber = getWeek(orderStartDateForWeekCalc, { weekStartsOn: 1 });
                const currentWeekNumber = getWeek(new Date(), { weekStartsOn: 1 });
                const weekDifference = currentWeekNumber - startWeekNumber;
                const dayOfWeek = new Date().getDay(); // 0=So, 1=Mo, ..., 6=Sa
                const currentDayName = dayNamesArray[dayOfWeek];

                const assignedRecurrenceIntervalWeeks = assignedEmployee?.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
                const assignedStartWeekOffset = assignedEmployee?.assigned_start_week_offset || order.object?.start_week_offset || 0;

                const schedules = parseDailySchedules(assignedEmployee?.assigned_daily_schedules || order.object?.daily_schedules || '[]');
                const scheduleForToday = schedules.find(s => 
                  s.day_of_week === currentDayName && 
                  s.week_offset_in_cycle === (weekDifference % assignedRecurrenceIntervalWeeks)
                );

                const assignedTimeForToday = (scheduleForToday && scheduleForToday.start_time && scheduleForToday.end_time)
                  ? `${scheduleForToday.start_time} - ${scheduleForToday.end_time}`
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
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {order.customer_name && (
                        <p className="text-sm text-muted-foreground">
                          Kunde: {order.customer_name}
                        </p>
                      )}
                      {order.object_name && (
                        <p className="text-sm text-muted-foreground">
                          Objekt: {order.object_name}
                        </p>
                      )}
                      {employeeNames !== 'N/A' && (
                        <div className="flex items-center">
                          <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Mitarbeiter: {employeeNames}</span>
                        </div>
                      )}
                      {order.service_type && (
                        <div className="flex items-center">
                          <Wrench className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Dienstleistung: {order.service_type}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Badge variant="outline">{order.order_type}</Badge>
                        <Badge variant={getPriorityBadgeVariant(order.priority)} className="ml-2">{order.priority}</Badge>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="ml-2">{order.status}</Badge>
                      </div>
                      {order.order_type === "one_time" && order.due_date && (
                        <div className="flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Fälligkeitsdatum: {format(new Date(order.due_date), 'dd.MM.yyyy', { locale: de })}</span>
                        </div>
                      )}
                      {(order.order_type === "recurring" || order.order_type === "substitution" || order.order_type === "permanent") && order.recurring_start_date && (
                        <div className="flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Zeitraum: {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                            {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                          </span>
                        </div>
                      )}
                      {assignedTimeForToday !== 'N/A' && (
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Zugewiesene Zeit heute: {assignedTimeForToday}</span>
                        </div>
                      )}
                      {order.object?.recurrence_interval_weeks && order.object.recurrence_interval_weeks > 1 && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          <span>Objekt-Wiederholung: Alle {order.object.recurrence_interval_weeks} Wochen (Offset: {order.object.start_week_offset})</span>
                        </div>
                      )}
                      {assignedEmployee?.assigned_recurrence_interval_weeks && assignedEmployee.assigned_recurrence_interval_weeks > 1 && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          <span>Mitarbeiter-Wiederholung: Alle {assignedEmployee.assigned_recurrence_interval_weeks} Wochen (Offset: {assignedEmployee.assigned_start_week_offset})</span>
                        </div>
                      )}
                      {order.request_status === 'pending' && (
                        <div className="flex items-center text-warning">
                          <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Anfrage: <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>{order.request_status}</Badge></span>
                          <OrderPlanningDialog order={order} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <OrdersTableView
            orders={allOrders}
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
  );
}