"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Clock, FileText, Wrench, UserRound, AlertTriangle, Star as StarIcon, PlusCircle, Briefcase, FileStack } from "lucide-react";
import { deleteOrder, createOrder } from "./actions";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Suspense, useEffect, useState, useCallback } from "react";
import { format, getWeek } from "date-fns";
import { de } from "date-fns/locale";
import { OrdersTableView } from "@/components/orders-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { AssignedEmployee } from "@/components/order-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Ensure these are imported
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { OrdersGridView } from "@/components/orders-grid-view";
import { OrdersGridSkeleton } from "@/components/orders-grid-skeleton";

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
  fixed_monthly_price: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  is_active: boolean;
  end_date: string | null;
  // Derived for display
  customer_name: string | null;
  object_name: string | null;
  object_address: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  hourly_rate: number | null;
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
  object: { name: string | null; address: string | null; notes: string | null; recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; } | null;
  customer: { name: string | null; } | null;
  customer_contact: { first_name: string | null; last_name: string | null; phone: string | null; } | null;
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
  const isActiveFilter = (currentSearchParams.get('isActive') || 'true') as string;
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
    const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name, status').eq('status', 'active').order('last_name', { ascending: true });
    const { data: serviceRatesData, error: serviceRatesError } = await supabase.from('service_rates').select('service_type, hourly_rate');

    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);
    if (serviceRatesError) console.error("Fehler beim Laden der Stundensätze:", serviceRatesError.message);

    setCustomers(customersData || []);
    setEmployees(employeesData || []);

    let ordersData: DisplayOrder[] = [];
    let ordersError: any = null;
    let ordersCount: number | null = 0;
    const ordersServiceRates = serviceRatesData || [];

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

    // Use the same comprehensive query for both search and non-search cases
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
        fixed_monthly_price,
        notes,
        request_status,
        service_type,
        is_active,
        end_date,
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

    // Apply base filters
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
    if (isActiveFilter === 'true') {
      selectQuery = selectQuery.eq('is_active', true);
    } else if (isActiveFilter === 'false') {
      selectQuery = selectQuery.eq('is_active', false);
    }

    // Apply search filter if query exists - search in main table first
    if (query) {
      selectQuery = selectQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error: selectError, count: selectCount } = await selectQuery
      .range(from, to);

    ordersData = data?.map(order => {
      const customerData = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      const objectData = Array.isArray(order.objects) ? order.objects[0] : order.objects;
      const customerContactData = Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts;

      const mappedAssignments = order.order_employee_assignments?.map((a: any) => ({
          employeeId: a.employee_id,
          assigned_daily_schedules: a.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
          assigned_start_week_offset: a.assigned_start_week_offset,
      })) || [];

      // Get hourly rate for this order's service type
      const hourlyRate = order.service_type
        ? ordersServiceRates.find((r: any) => r.service_type === order.service_type)?.hourly_rate || null
        : null;

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
        fixed_monthly_price: order.fixed_monthly_price,
        notes: order.notes,
        request_status: order.request_status,
        service_type: order.service_type,
        is_active: order.is_active,
        end_date: order.end_date,
        order_feedback: order.order_feedback,
        customer_name: customerData?.name || null,
        object_name: objectData?.name || null,
        object_address: objectData?.address || null,
        customer_contact_first_name: customerContactData?.first_name || null,
        customer_contact_last_name: customerContactData?.last_name || null,
        employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
        employee_first_names: order.order_employee_assignments?.map((a: any) => {
          const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
          return employee?.first_name || '';
        }) || null,
        employee_last_names: order.order_employee_assignments?.map((a: any) => {
          const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
          return employee?.last_name || '';
        }) || null,
        hourly_rate: hourlyRate,
        assignedEmployees: mappedAssignments,
        object: objectData,
        customer: customerData,
        customer_contact: customerContactData,
      };
    }) || [];
    ordersError = selectError;
    ordersCount = selectCount;

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
    isActiveFilter,
    sortColumn,
    sortDirection,
    currentSearchParams
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title="Auftragsverwaltung" loading={true} />
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-8">
            <OrdersGridSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const pendingRequests = allOrders.filter(order => order.request_status === 'pending');
  const otherOrders = allOrders.filter(order => order.request_status !== 'pending');

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

  const isActiveOptions = [
    { value: 'true', label: 'Aktiv' },
    { value: 'false', label: 'Inaktiv' },
  ];

  const filterOptions: FilterOption[] = [
    { value: 'status', label: 'Status', options: orderStatusOptions },
    { value: 'orderType', label: 'Auftragstyp', options: orderTypeOptions },
    { value: 'serviceType', label: 'Dienstleistung', options: availableServices.map(s => ({ value: s, label: s })) },
    { value: 'customerId', label: 'Kunde', options: customers.map(c => ({ value: c.id, label: c.name })) },
    { value: 'employeeId', label: 'Mitarbeiter', options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
    { value: 'isActive', label: 'Aktivitätsstatus', options: isActiveOptions },
  ];

  const sortOptions: SortOption[] = [
    { value: 'created_at', label: 'Erstellt am' },
    { value: 'title', label: 'Titel' },
    { value: 'status', label: 'Status' },
    { value: 'customers.name', label: 'Kunde' },
    { value: 'objects.name', label: 'Objekt' },
    { value: 'priority', label: 'Priorität' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title="Auftragsverwaltung" loading={loading}>
        <OrderCreateDialog />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Aufträge suchen..."
            filterOptions={filterOptions}
            sortOptions={sortOptions}
          />
          {totalCount !== null && !loading && (
            <div className="text-sm text-muted-foreground mt-2">
              {totalCount} {totalCount === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden.
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
            <div className="flex justify-end mb-4">
              <TabsList className="hidden md:grid grid-cols-2 w-fit">
                <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
                <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="grid" className="mt-0">
              {loading ? (
                <OrdersGridSkeleton />
              ) : (
                <OrdersGridView
                  orders={otherOrders}
                  employees={employees}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-muted/60 rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <OrdersTableView
                  orders={otherOrders}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          {!loading && !query && totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}