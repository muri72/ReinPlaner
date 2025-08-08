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
import { formatDuration } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import { formatISO, parseISO } from "date-fns";

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
  type: string;
  notes: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface ObjectItem {
  id: string;
  name: string;
  customer_id: string;
}

interface Order {
  id: string;
  title: string;
  customer_id: string;
  object_id: string;
}

export function AdminTimeEntriesOverview() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [timeEntries, setTimeEntries] = useState<DisplayTimeEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  // Filter states, initialized from URL params
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get("userId") || null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(searchParams.get("employeeId") || null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(searchParams.get("customerId") || null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(searchParams.get("objectId") || null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(searchParams.get("orderId") || null);
  const [startDate, setStartDate] = useState<Date | null>(searchParams.get("startDate") ? parseISO(searchParams.get("startDate")!) : null);
  const [endDate, setEndDate] = useState<Date | null>(searchParams.get("endDate") ? parseISO(searchParams.get("endDate")!) : null);
  const currentQuery = searchParams.get("query") || "";

  // Fetch dropdown data (users, employees, customers, objects, orders)
  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      if (profiles) setUsers(profiles.map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, email: null })));
      if (profilesError) console.error("Fehler beim Laden der Benutzerprofile:", profilesError);

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });
      if (employeesData) setEmployees(employeesData);
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      const { data: objectsData, error: objectsError } = await supabase
        .from('objects')
        .select('id, name, customer_id')
        .order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, title, customer_id, object_id')
        .order('title', { ascending: true });
      if (ordersData) setOrders(ordersData);
      if (ordersError) console.error("Fehler beim Laden der Aufträge:", ordersError);
    };
    fetchDropdownData();
  }, [supabase]);

  // Fetch time entries based on all filters
  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_time_entries', {
        search_query: currentQuery,
        filter_user_id: selectedUserId,
        filter_employee_id: selectedEmployeeId,
        filter_customer_id: selectedCustomerId,
        filter_object_id: selectedObjectId,
        filter_order_id: selectedOrderId,
        start_date_filter: startDate ? formatISO(startDate, { representation: 'date' }) : null,
        end_date_filter: endDate ? formatISO(endDate, { representation: 'date' }) : null,
      });

      if (data) {
        setTimeEntries(data as DisplayTimeEntry[]);
      }
      if (error) {
        console.error("Fehler beim Laden der Zeiteinträge:", error);
        // toast.error("Fehler beim Laden der Zeiteinträge."); // Optional: Toast bei Fehler
      }
      setLoading(false);
    };

    fetchTimeEntries();
  }, [
    selectedUserId,
    selectedEmployeeId,
    selectedCustomerId,
    selectedObjectId,
    selectedOrderId,
    startDate,
    endDate,
    currentQuery,
    supabase,
  ]);

  // Helper to update URL search params
  const updateSearchParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateSearchParams("query", term);
  }, 300);

  const handleUserFilterChange = (userId: string) => {
    const value = userId === "all" ? null : userId;
    setSelectedUserId(value);
    updateSearchParams("userId", value);
  };

  const handleEmployeeFilterChange = (employeeId: string) => {
    const value = employeeId === "all" ? null : employeeId;
    setSelectedEmployeeId(value);
    updateSearchParams("employeeId", value);
  };

  const handleCustomerFilterChange = (customerId: string) => {
    const value = customerId === "all" ? null : customerId;
    setSelectedCustomerId(value);
    setSelectedObjectId(null); // Reset object filter when customer changes
    setSelectedOrderId(null); // Reset order filter when customer changes
    updateSearchParams("customerId", value);
    updateSearchParams("objectId", null);
    updateSearchParams("orderId", null);
  };

  const handleObjectFilterChange = (objectId: string) => {
    const value = objectId === "all" ? null : objectId;
    setSelectedObjectId(value);
    setSelectedOrderId(null); // Reset order filter when object changes
    updateSearchParams("objectId", value);
    updateSearchParams("orderId", null);
  };

  const handleOrderFilterChange = (orderId: string) => {
    const value = orderId === "all" ? null : orderId;
    setSelectedOrderId(value);
    updateSearchParams("orderId", value);
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    updateSearchParams("startDate", date ? formatISO(date, { representation: 'date' }) : null);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    updateSearchParams("endDate", date ? formatISO(date, { representation: 'date' }) : null);
  };

  // Filtered dropdown options based on selections
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : objects;

  const filteredOrders = selectedObjectId
    ? orders.filter(order => order.object_id === selectedObjectId)
    : (selectedCustomerId ? orders.filter(order => order.customer_id === selectedCustomerId) : orders);

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

  if (loading) {
    return <div className="text-center py-4">Lade Zeiteinträge...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zeiterfassung (Admin-Ansicht)</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
        <div className="col-span-full">
          <SearchInput placeholder="Zeiteinträge suchen..." />
        </div>
        <Select onValueChange={handleUserFilterChange} value={selectedUserId || "all"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Benutzer filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Benutzer</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={handleEmployeeFilterChange} value={selectedEmployeeId || "all"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={handleCustomerFilterChange} value={selectedCustomerId || "all"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden</SelectItem>
            {customers.map(cust => (
              <SelectItem key={cust.id} value={cust.id}>
                {cust.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={handleObjectFilterChange} value={selectedObjectId || "all"} disabled={!selectedCustomerId && objects.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Objekt filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Objekte</SelectItem>
            {filteredObjects.map(obj => (
              <SelectItem key={obj.id} value={obj.id}>
                {obj.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={handleOrderFilterChange} value={selectedOrderId || "all"} disabled={(!selectedCustomerId && !selectedObjectId) && orders.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftrag filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Aufträge</SelectItem>
            {filteredOrders.map(order => (
              <SelectItem key={order.id} value={order.id}>
                {order.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker
          label="Startdatum"
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Von Datum"
        />
        <DatePicker
          label="Enddatum"
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Bis Datum"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timeEntries.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            {currentQuery || selectedUserId || selectedEmployeeId || selectedCustomerId || selectedObjectId || selectedOrderId || startDate || endDate ? "Keine Zeiteinträge für diese Filter gefunden." : "Noch keine Zeiteinträge vorhanden."}
          </p>
        ) : (
          timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  Zeiteintrag
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge>
                  <TimeEntryEditDialog timeEntry={entry} />
                  <DeleteTimeEntryButton entryId={entry.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
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
                    <span>Dauer: {formatDuration(entry.duration_minutes)}</span>
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
    </div>
  );
}