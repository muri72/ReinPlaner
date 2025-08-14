"use client";

import { useState, useEffect, useCallback } from "react"; // Import useCallback
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, UserRound, Building, Briefcase, FileText, ArrowUp, ArrowDown } from "lucide-react"; // Import ArrowUp, ArrowDown
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button"; // Corrected import syntax
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { formatDuration } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import table components
import { Button } from "@/components/ui/button"; // Import Button for sortable headers
import { cn } from "@/lib/utils"; // Import cn for conditional styling
import { PaginationControls } from "@/components/pagination-controls"; // Import PaginationControls
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

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
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10; // Set page size to 10
  const [totalCount, setTotalCount] = useState<number | null>(0);

  // Sorting parameters
  const sortColumn = searchParams.get('sortColumn') || 'start_time';
  const sortDirection = searchParams.get('sortDirection') || 'desc';

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

  // Fetch time entries based on filters and sorting
  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

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
        `, { count: 'exact' }) // Request count
        .order(sortColumn, { ascending: sortDirection === 'asc' }); // Apply sorting

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

      const { data, error, count } = await queryBuilder.range(from, to);

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
        setTotalCount(count);
      }
      if (error) {
        console.error("Fehler beim Laden der Zeiteinträge:", error);
      }
      setLoading(false);
    };

    fetchTimeEntries();
  }, [selectedEmployeeId, currentQuery, supabase, sortColumn, sortDirection, currentPage, pageSize]);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    params.set('page', '1'); // Reset to first page on search
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleEmployeeFilterChange = (employeeId: string) => {
    const params = new URLSearchParams(searchParams);
    if (employeeId && employeeId !== "all") {
      params.set("employeeId", employeeId);
    } else {
      params.delete("employeeId");
    }
    params.set('page', '1'); // Reset to first page on filter change
    replace(`${pathname}?${params.toString()}`);
    setSelectedEmployeeId(employeeId === "all" ? null : employeeId);
  };

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1'); // Reset to first page on sort change
    replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, replace, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
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

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

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
        <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[100px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-6 w-full" /></TableHead>
                <TableHead className="text-right min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => handleSort('start_time')} className="px-0 hover:bg-transparent">
                    Startzeit {renderSortIcon('start_time')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('end_time')} className="px-0 hover:bg-transparent">
                    Endzeit {renderSortIcon('end_time')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('duration_minutes')} className="px-0 hover:bg-transparent">
                    Dauer (Brutto) {renderSortIcon('duration_minutes')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('break_minutes')} className="px-0 hover:bg-transparent">
                    Pause {renderSortIcon('break_minutes')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('employees.last_name')} className="px-0 hover:bg-transparent">
                    Mitarbeiter {renderSortIcon('employees.last_name')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('customers.name')} className="px-0 hover:bg-transparent">
                    Kunde {renderSortIcon('customers.name')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('objects.name')} className="px-0 hover:bg-transparent">
                    Objekt {renderSortIcon('objects.name')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('orders.title')} className="px-0 hover:bg-transparent">
                    Auftrag {renderSortIcon('orders.title')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => handleSort('type')} className="px-0 hover:bg-transparent">
                    Typ {renderSortIcon('type')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[200px]">Notizen</TableHead>
                <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                    {currentQuery || selectedEmployeeId ? "Keine Zeiteinträge für diese Filter gefunden." : "Noch keine Zeiteinträge vorhanden."}
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-sm">{new Date(entry.start_time).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{entry.end_time ? new Date(entry.end_time).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell className="text-sm">{formatDuration(entry.duration_minutes)}</TableCell>
                    <TableCell className="text-sm">{formatDuration(entry.break_minutes)}</TableCell>
                    <TableCell className="text-sm">
                      {entry.employee_first_name && entry.employee_last_name
                        ? `${entry.employee_first_name} ${entry.employee_last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">{entry.customer_name || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{entry.object_name || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{entry.order_title || 'N/A'}</TableCell>
                    <TableCell><Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge></TableCell>
                    <TableCell className="text-sm">{entry.notes || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <RecordDetailsDialog record={entry} title={`Details zu Zeiteintrag`} />
                        <TimeEntryEditDialog timeEntry={entry} currentUserId={currentUserId} isAdmin={isAdmin} />
                        <DeleteTimeEntryButton entryId={entry.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!currentQuery && totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          )}
        </div>
      )}
    </div>
  );
}