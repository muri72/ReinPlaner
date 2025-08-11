"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, UserRound, Building, Briefcase, FileText } from "lucide-react";
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button";
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { formatDuration } from "@/lib/utils"; // Importiere formatDuration
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

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
  break_minutes: number | null; // Neues Feld
  type: string;
  notes: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

interface EmployeeFilterItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface AdminTimeEntriesOverviewProps {
  currentUserId: string;
  isAdmin: boolean;
}

export function AdminTimeEntriesOverview({ currentUserId, isAdmin }: AdminTimeEntriesOverviewProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [timeEntries, setTimeEntries] = useState<DisplayTimeEntry[]>([]);
  const [employees, setEmployees] = useState<EmployeeFilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(searchParams.get("employeeId") || null);
  const currentQuery = searchParams.get("query") || "";

  // Fetch employees for the filter dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });
      if (data) {
        setEmployees(data);
      }
      if (error) console.error("Fehler beim Laden der Mitarbeiter:", error);
    };
    fetchEmployees();
  }, [supabase]);

  // Fetch time entries based on filters
  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoading(true);
      let queryBuilder = supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          employee_id,
          customer_id,
          object_id,
          order_id,
          start_time,
          end_time,
          duration_minutes,
          break_minutes,
          type,
          notes,
          employees ( first_name, last_name ),
          customers ( name ),
          objects ( name ),
          orders ( title )
        `)
        .order('start_time', { ascending: false });

      // Apply employee_id filter if selected
      if (selectedEmployeeId && selectedEmployeeId !== "all") {
        queryBuilder = queryBuilder.eq('employee_id', selectedEmployeeId);
      }

      // Apply search query if present
      if (currentQuery) {
        queryBuilder = queryBuilder.or(
          `notes.ilike.%${currentQuery}%,employees.first_name.ilike.%${currentQuery}%,employees.last_name.ilike.%${currentQuery}%,customers.name.ilike.%${currentQuery}%,objects.name.ilike.%${currentQuery}%,orders.title.ilike.%${currentQuery}%,type.ilike.%${currentQuery}%`
        );
      }

      const { data, error } = await queryBuilder;

      if (data) {
        setTimeEntries(data.map(entry => {
          const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
          const customer = Array.isArray(entry.customers) ? entry.customers[0] : entry.customers;
          const object = Array.isArray(entry.objects) ? entry.objects[0] : entry.objects;
          const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
          return {
            id: entry.id,
            user_id: entry.user_id,
            employee_id: entry.employee_id,
            customer_id: entry.customer_id,
            object_id: entry.object_id,
            order_id: entry.order_id,
            start_time: entry.start_time,
            end_time: entry.end_time,
            duration_minutes: entry.duration_minutes,
            break_minutes: entry.break_minutes,
            type: entry.type,
            notes: entry.notes,
            employee_first_name: employee?.first_name || null,
            employee_last_name: employee?.last_name || null,
            customer_name: customer?.name || null,
            object_name: object?.name || null,
            order_title: order?.title || null,
          }
        }));
      }
      if (error) {
        console.error("Fehler beim Laden der Zeiteinträge:", error);
      }
      setLoading(false);
    };

    fetchTimeEntries();
  }, [selectedEmployeeId, currentQuery, supabase]);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleEmployeeFilterChange = (employeeId: string) => {
    const params = new URLSearchParams(searchParams);
    if (employeeId && employeeId !== "all") {
      params.set("employeeId", employeeId);
    } else {
      params.delete("employeeId");
    }
    replace(`${pathname}?${params.toString()}`);
    setSelectedEmployeeId(employeeId === "all" ? null : employeeId);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'manual':
        return 'outline';
      case 'clock_in_out':
        return 'default';
      case 'stopwatch':
        return 'secondary';
      case 'automatic_scheduled_order':
        return 'success';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zeiterfassung (Admin-Ansicht)</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-grow">
          <SearchInput placeholder="Zeiteinträge suchen..." />
        </div>
        <div className="w-full sm:w-auto">
          <Select onValueChange={handleEmployeeFilterChange} value={selectedEmployeeId || "all"}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Mitarbeiter filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-elevation-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timeEntries.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground text-sm"> {/* Changed to text-sm */}
              {currentQuery || selectedEmployeeId ? "Keine Zeiteinträge für diese Filter gefunden." : "Noch keine Zeiteinträge vorhanden."}
            </p>
          ) : (
            timeEntries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold"> {/* Changed to text-lg font-semibold */}
                    Zeiteintrag
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge>
                    <TimeEntryEditDialog timeEntry={entry} currentUserId={currentUserId} isAdmin={isAdmin} />
                    <DeleteTimeEntryButton entryId={entry.id} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground"> {/* Changed to text-sm */}
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Start: {new Date(entry.start_time).toLocaleString()}</span>
                  </div>
                  {entry.end_time && (
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Ende: {new Date(entry.end_time).toLocaleString()}</span>
                    </div>
                  )}
                  {entry.duration_minutes !== null && (
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Dauer (Brutto): {formatDuration(entry.duration_minutes)}</span>
                    </div>
                  )}
                  {entry.break_minutes !== null && entry.break_minutes > 0 && (
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Pause: {formatDuration(entry.break_minutes)}</span>
                    </div>
                  )}
                  {entry.employee_first_name && entry.employee_last_name && (
                    <div className="flex items-center">
                      <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Mitarbeiter: {entry.employee_first_name} {entry.employee_last_name}</span>
                    </div>
                  )}
                  {entry.customer_name && (
                    <div className="flex items-center">
                      <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Kunde: {entry.customer_name}</span>
                    </div>
                  )}
                  {entry.object_name && (
                    <div className="flex items-center">
                      <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Objekt: {entry.object_name}</span>
                    </div>
                  )}
                  {entry.order_title && (
                    <div className="flex items-center">
                      <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Auftrag: {entry.order_title}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Notizen: {entry.notes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}