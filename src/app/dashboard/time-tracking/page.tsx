"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { PlusCircle } from "lucide-react";
import { getWeek } from 'date-fns';
import { TimeTrackingCharts } from '@/components/time-tracking-charts';
import { AdminTimeEntriesOverview } from "@/components/admin-time-entries-overview";
import { TimeEntryCreateDialog } from "@/components/time-entry-create-dialog";
import { useCallback, useEffect, useState } from "react";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { toast } from "sonner";
import { generateShiftsFromAssignments } from "./actions";

interface DisplayTimeEntry {
  id: string;
  user_id: string;
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  type: string;
  notes: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

export default function TimeTrackingPage() {
  const supabase = createClient();
  const currentSearchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeEntries, setTimeEntries] = useState<DisplayTimeEntry[]>([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState<{ start_time: string; end_time: string | null; duration_minutes: number | null; break_minutes: number | null; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const employeeIdFilter = currentSearchParams.get('employeeId') || '';
  const sortColumn = currentSearchParams.get('sortColumn') || 'start_time';
  const sortDirection = currentSearchParams.get('sortDirection') || 'desc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect("/login");
      return;
    }
    setCurrentUser(currentUser);

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError) console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);

    const isAdminUser = userProfile?.role === 'admin';
    setIsAdmin(isAdminUser);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let queryBuilder = supabase
      .from('time_entries')
      .select(`
        id, user_id, employee_id, customer_id, object_id, order_id, start_time, end_time,
        duration_minutes, break_minutes, type, notes,
        employees ( first_name, last_name ),
        customers ( name ),
        objects ( name ),
        orders ( title )
      `, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (!isAdminUser) {
      queryBuilder = queryBuilder.eq('user_id', currentUser.id);
    }
    if (employeeIdFilter) {
      queryBuilder = queryBuilder.eq('employee_id', employeeIdFilter);
    }
    if (query) {
      queryBuilder = queryBuilder.or(`notes.ilike.%${query}%,employees.first_name.ilike.%${query}%,employees.last_name.ilike.%${query}%,customers.name.ilike.%${query}%,objects.name.ilike.%${query}%,orders.title.ilike.%${query}%,type.ilike.%${query}%`);
    }

    const { data: entriesData, error: entriesError, count } = await queryBuilder.range(from, to);

    setTimeEntries(entriesData?.map(entry => {
      const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
      const customer = Array.isArray(entry.customers) ? entry.customers[0] : entry.customers;
      const object = Array.isArray(entry.objects) ? entry.objects[0] : entry.objects;
      const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
      return {
        id: entry.id, user_id: entry.user_id, employee_id: entry.employee_id, customer_id: entry.customer_id,
        object_id: entry.object_id, order_id: entry.order_id, start_time: entry.start_time, end_time: entry.end_time,
        duration_minutes: entry.duration_minutes, break_minutes: entry.break_minutes, type: entry.type, notes: entry.notes,
        employee_first_name: employee?.first_name || null, employee_last_name: employee?.last_name || null,
        customer_name: customer?.name || null, object_name: object?.name || null, order_title: order?.title || null,
      }
    }) || []);
    setTotalCount(count);
    if (entriesError) console.error("Fehler beim Laden der Zeiteinträge:", entriesError?.message || entriesError);

    // Fetch only active employees for the filter dropdown
    const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('last_name', { ascending: true });
    if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);
    setEmployees(employeesData || []);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    let recentQueryBuilder = supabase
      .from('time_entries')
      .select('start_time, end_time, duration_minutes, break_minutes')
      .gte('start_time', threeMonthsAgo.toISOString())
      .lt('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!isAdminUser) {
      recentQueryBuilder = recentQueryBuilder.eq('user_id', currentUser.id);
    }
    const { data: recentData, error: recentError } = await recentQueryBuilder;
    setRecentTimeEntries(recentData || []);
    if (recentError) console.error("Fehler beim Laden der letzten Zeiteinträge für Charts:", recentError?.message || recentError);

    setLoading(false);
  }, [supabase, currentPage, pageSize, query, employeeIdFilter, sortColumn, sortDirection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null;;
  }

  const weeklyData: { [key: string]: number } = {};
  const monthlyData: { [key: string]: number } = {};
  recentTimeEntries.forEach(entry => {
    if (entry.start_time && entry.duration_minutes !== null) {
      const startDate = new Date(entry.start_time);
      const netDurationHours = (entry.duration_minutes - (entry.break_minutes || 0)) / 60;
      const year = startDate.getFullYear();
      const week = getWeek(startDate, { weekStartsOn: 1 });
      const weekKey = `${year}-${String(week).padStart(2, '0')}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + netDurationHours;
      const month = startDate.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + netDurationHours;
    }
  });

  const formattedWeeklyData = Object.keys(weeklyData).sort().map(key => ({
    name: `KW ${key.substring(5)}`,
    hours: parseFloat(weeklyData[key].toFixed(2))
  }));
  const formattedMonthlyData = Object.keys(monthlyData).sort().map(key => ({
    name: `${new Date(parseInt(key.substring(0,4)), parseInt(key.substring(5,7)) - 1, 1).toLocaleString('de-DE', { month: 'short', year: '2-digit' })}`,
    hours: parseFloat(monthlyData[key].toFixed(2))
  }));

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    { value: 'employeeId', label: 'Mitarbeiter', options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
  ];

  const sortOptions: SortOption[] = [
    { value: 'start_time', label: 'Startzeit' },
    { value: 'employees.last_name', label: 'Mitarbeiter' },
    { value: 'customers.name', label: 'Kunde' },
    { value: 'objects.name', label: 'Objekt' },
    { value: 'orders.title', label: 'Auftrag' },
    { value: 'duration_minutes', label: 'Dauer' },
    { value: 'type', label: 'Typ' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      
      <h1 className="text-2xl md:text-3xl font-bold">Zeiterfassung</h1>

      {isAdmin ? (
        <>
          <Card className="shadow-neumorphic glassmorphism-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Zeiteinträge verwalten</CardTitle>
              <DataTableToolbar
                searchPlaceholder="Zeiteinträge suchen..."
                filterOptions={filterOptions}
                sortOptions={sortOptions}
              />
              {totalCount !== null && (
                <div className="text-sm text-muted-foreground mt-2">
                  {totalCount} {totalCount === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden.
                </div>
              )}
            </CardHeader>
            <CardContent>
              <AdminTimeEntriesOverview
                timeEntries={timeEntries}
                loading={loading}
                totalPages={totalPages}
                currentPage={currentPage}
                currentUserId={currentUser.id}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
          <TimeEntryCreateDialog
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
            triggerButtonText="Neuen Zeiteintrag manuell hinzufügen"
            triggerButtonIcon={<PlusCircle className="mr-2 h-4 w-4" />}
            triggerButtonClassName="transition-colors duration-200"
            onEntryCreated={fetchData}
          />
        </>
      ) : (
        <>
          <h2 className="text-xl md:text-2xl font-bold mt-8">Ihre Stempeluhr</h2>
          <EmployeeTimeTracker userId={currentUser.id} />
          <h2 className="text-xl md:text-2xl font-bold mt-8">Ihre Stundenübersicht (letzte 3 Monate)</h2>
          <TimeTrackingCharts weeklyData={formattedWeeklyData} monthlyData={formattedMonthlyData} />
          <h2 className="text-xl md:text-2xl font-bold mt-8">Ihre Zeiteinträge</h2>
          <div className="flex justify-end mb-4">
            <TimeEntryCreateDialog
              currentUserId={currentUser.id}
              isAdmin={isAdmin}
              triggerButtonText="Neuen Zeiteintrag hinzufügen"
              triggerButtonIcon={<PlusCircle className="mr-2 h-4 w-4" />}
              triggerButtonClassName="transition-colors duration-200"
              onEntryCreated={fetchData}
            />
          </div>
          <AdminTimeEntriesOverview
            timeEntries={timeEntries}
            loading={loading}
            totalPages={totalPages}
            currentPage={currentPage}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  );
}