/**
 * Custom Hooks for Form Data Fetching
 *
 * These hooks encapsulate data fetching logic that was previously
 * duplicated across multiple form components.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for fetching customers, objects, and services for dropdowns
 * Previously duplicated across order-form.tsx, object-form.tsx, and others
 */
export function useFormDropdownData() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [services, setServices] = useState<{ id: string; key: string; title: string; default_hourly_rate: number | null }[]>([]);
  const [serviceRates, setServiceRates] = useState<{ service_type: string; hourly_rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });
      if (customersError) throw customersError;
      if (customersData) setCustomers(customersData);

      // Fetch objects
      const { data: objectsData, error: objectsError } = await supabase
        .from('objects')
        .select('*')
        .order('name', { ascending: true });
      if (objectsError) throw objectsError;
      if (objectsData) setObjects(objectsData);

      // Fetch services
      const { getServices } = await import("@/app/dashboard/services/actions");
      const servicesData = await getServices();
      setServices(servicesData.map(s => ({
        id: s.id,
        key: s.key,
        title: s.name,
        default_hourly_rate: s.default_hourly_rate ?? null
      })));

      // Fetch service rates (legacy support)
      const { data: ratesData, error: ratesError } = await supabase
        .from('service_rates')
        .select('service_type, hourly_rate');
      if (ratesError) throw ratesError;
      if (ratesData) setServiceRates(ratesData);

    } catch (err) {
      console.error("Error fetching dropdown data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    customers,
    objects,
    services,
    serviceRates,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching customer contacts
 * Previously duplicated in multiple form components
 */
export function useCustomerContacts(customerId: string | null) {
  const supabase = createClient();
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async (id: string) => {
    if (!id) {
      setContacts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('id, first_name, last_name, customer_id')
        .eq('customer_id', id)
        .order('last_name', { ascending: true });

      if (contactsError) throw contactsError;
      if (data) setContacts(data);
    } catch (err) {
      console.error("Error fetching customer contacts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (customerId) {
      fetchContacts(customerId);
    } else {
      setContacts([]);
    }
  }, [customerId, fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refetch: () => customerId && fetchContacts(customerId),
  };
}

/**
 * Hook for fetching employees
 * Previously duplicated across multiple form components
 */
export function useEmployees() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, status')
        .order('last_name', { ascending: true });

      if (employeesError) throw employeesError;
      if (data) setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
  };
}

/**
 * Hook for auto-generating form titles based on selected values
 * Previously duplicated in order-form.tsx and object-form.tsx
 */
export function useAutoTitle(form: any, options: {
  fields: string[];
  separator?: string;
  enabled?: boolean;
}) {
  const { fields, separator = ' • ', enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const values = fields.map(field => {
      const value = form.getValues(field);
      if (!value) return null;

      // Handle special cases (e.g., get name from ID)
      if (field === 'customerId') {
        // This would need to be passed in or use a selector
        return null;
      }

      return value;
    }).filter(Boolean);

    if (values.length > 0) {
      const generatedTitle = values.join(separator);
      const currentTitle = form.getValues('title');

      if (currentTitle !== generatedTitle) {
        form.setValue('title', generatedTitle);
      }
    }
  }, [form, fields.join(','), separator, enabled]);
}

/**
 * Hook for calculating estimated hours based on employee schedules
 * Previously duplicated in order-form.tsx
 */
export function useCalculateEstimatedHours(assignedEmployees: any[], objects: any[], objectId: string | null) {
  const [totalHours, setTotalHours] = useState<number | null>(null);

  useEffect(() => {
    if (!assignedEmployees || assignedEmployees.length === 0 || !objectId) {
      setTotalHours(null);
      return;
    }

    const selectedObject = objects.find(obj => obj.id === objectId);
    if (!selectedObject) {
      setTotalHours(null);
      return;
    }

    let total = 0;
    assignedEmployees.forEach(emp => {
      if (emp.assigned_daily_schedules) {
        emp.assigned_daily_schedules.forEach((weekSchedule: any) => {
          Object.values(weekSchedule).forEach((daySchedule: any) => {
            if (daySchedule?.hours) {
              total += Number(daySchedule.hours);
            }
          });
        });
      }
    });

    setTotalHours(total);
  }, [assignedEmployees, objectId, objects]);

  return totalHours;
}

/**
 * Example usage in a form component:
 *
 * ```tsx
 * function MyForm() {
 *   const form = useForm();
 *
 *   // Use shared data fetching hooks
 *   const { customers, objects, services } = useFormDropdownData();
 *   const { contacts } = useCustomerContacts(form.watch('customerId'));
 *   const { employees } = useEmployees();
 *
 *   // Use auto-title generation
 *   useAutoTitle(form, {
 *     fields: ['customerId', 'objectId'],
 *     enabled: !initialData
 *   });
 *
 *   // Use calculated values
 *   const totalHours = useCalculateEstimatedHours(
 *     form.watch('assignedEmployees'),
 *     objects,
 *     form.watch('objectId')
 *   );
 *
 *   return (
 *     // Form JSX
 *   );
 * }
 * ```
 *
 * Benefits:
 * - Eliminates 50+ lines of duplicated data fetching code
 * - Consistent data fetching across forms
 * - Better error handling
 * - Loading states handled consistently
 * - Reusable across any form component
 */
