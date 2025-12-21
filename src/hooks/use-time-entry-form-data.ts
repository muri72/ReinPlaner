/**
 * Custom Hook for Time Entry Form Data
 *
 * Extracted from time-entry-form.tsx
 * Handles data fetching for employees, customers, objects, and orders.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TimeEntryEmployee {
  id: string;
  first_name: string;
  last_name: string;
}

export interface TimeEntryCustomer {
  id: string;
  name: string;
}

export interface TimeEntryObject {
  id: string;
  name: string;
  customer_id: string;
  monday_start_time: string | null;
  monday_end_time: string | null;
  tuesday_start_time: string | null;
  tuesday_end_time: string | null;
  wednesday_start_time: string | null;
  wednesday_end_time: string | null;
  thursday_start_time: string | null;
  thursday_end_time: string | null;
  friday_start_time: string | null;
  friday_end_time: string | null;
  saturday_start_time: string | null;
  saturday_end_time: string | null;
  sunday_start_time: string | null;
  sunday_end_time: string | null;
}

export interface TimeEntryOrder {
  id: string;
  title: string;
  customer_id: string;
  object_id: string;
}

interface UseTimeEntryFormDataProps {
  currentUserId: string;
  isAdmin: boolean;
  initialEmployeeId?: string | null;
  onEmployeeAutoSet?: (employeeId: string) => void;
}

interface UseTimeEntryFormDataReturn {
  employees: TimeEntryEmployee[];
  customers: TimeEntryCustomer[];
  objects: TimeEntryObject[];
  orders: TimeEntryOrder[];
  loading: boolean;
  getFilteredObjects: (customerId: string | null) => TimeEntryObject[];
  getFilteredOrders: (customerId: string | null, objectId: string | null) => TimeEntryOrder[];
  getObjectSchedule: (objectId: string, dayOfWeek: number) => { startTime: string | null; endTime: string | null };
}

/**
 * Custom hook for fetching and managing time entry form dropdown data
 */
export function useTimeEntryFormData({
  currentUserId,
  isAdmin,
  initialEmployeeId,
  onEmployeeAutoSet,
}: UseTimeEntryFormDataProps): UseTimeEntryFormDataReturn {
  const supabase = createClient();
  const [employees, setEmployees] = useState<TimeEntryEmployee[]>([]);
  const [customers, setCustomers] = useState<TimeEntryCustomer[]>([]);
  const [objects, setObjects] = useState<TimeEntryObject[]>([]);
  const [orders, setOrders] = useState<TimeEntryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoading(true);

      // Fetch employees based on admin status
      let employeesQuery = supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (!isAdmin) {
        employeesQuery = employeesQuery.eq('user_id', currentUserId);
      }

      const { data: employeesData, error: employeesError } = await employeesQuery;
      if (employeesData) {
        setEmployees(employeesData);
        // If not admin and an employee is found, auto-set it
        if (!isAdmin && employeesData.length > 0 && !initialEmployeeId) {
          onEmployeeAutoSet?.(employeesData[0].id);
        }
      }
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      // Fetch objects with time schedules
      const { data: objectsData, error: objectsError } = await supabase
        .from('objects')
        .select('id, name, customer_id, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time')
        .order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, title, customer_id, object_id')
        .order('title', { ascending: true });
      if (ordersData) setOrders(ordersData);
      if (ordersError) console.error("Fehler beim Laden der Aufträge:", ordersError);

      setLoading(false);
    };
    fetchDropdownData();
  }, [supabase, currentUserId, isAdmin, initialEmployeeId, onEmployeeAutoSet]);

  // Filter objects by customer
  const getFilteredObjects = useCallback((customerId: string | null): TimeEntryObject[] => {
    if (!customerId) return [];
    return objects.filter(obj => obj.customer_id === customerId);
  }, [objects]);

  // Filter orders by customer and/or object
  const getFilteredOrders = useCallback((customerId: string | null, objectId: string | null): TimeEntryOrder[] => {
    if (objectId) {
      return orders.filter(order => order.object_id === objectId);
    }
    if (customerId) {
      return orders.filter(order => order.customer_id === customerId);
    }
    return [];
  }, [orders]);

  // Get object schedule for a specific day
  const getObjectSchedule = useCallback((objectId: string, dayOfWeek: number): { startTime: string | null; endTime: string | null } => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return { startTime: null, endTime: null };

    switch (dayOfWeek) {
      case 0: return { startTime: obj.sunday_start_time, endTime: obj.sunday_end_time };
      case 1: return { startTime: obj.monday_start_time, endTime: obj.monday_end_time };
      case 2: return { startTime: obj.tuesday_start_time, endTime: obj.tuesday_end_time };
      case 3: return { startTime: obj.wednesday_start_time, endTime: obj.wednesday_end_time };
      case 4: return { startTime: obj.thursday_start_time, endTime: obj.thursday_end_time };
      case 5: return { startTime: obj.friday_start_time, endTime: obj.friday_end_time };
      case 6: return { startTime: obj.saturday_start_time, endTime: obj.saturday_end_time };
      default: return { startTime: null, endTime: null };
    }
  }, [objects]);

  return {
    employees,
    customers,
    objects,
    orders,
    loading,
    getFilteredObjects,
    getFilteredOrders,
    getObjectSchedule,
  };
}
