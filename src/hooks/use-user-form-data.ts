/**
 * Custom Hook for User Form Data
 *
 * Extracted from user-form.tsx
 * Handles data fetching for employees, customers, and customer contacts.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string | null;
  email: string | null;
}

export interface Customer {
  id: string;
  name: string;
  user_id: string | null;
  contact_email: string | null;
}

export interface CustomerContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  customer_id: string;
  user_id: string | null;
}

export interface CustomerForManager {
  id: string;
  name: string;
}

interface UseUserFormDataReturn {
  employees: Employee[];
  customers: Customer[];
  customerContactsForUserAssignment: CustomerContact[];
  allCustomersForManager: CustomerForManager[];
  loadingDropdowns: boolean;
  fetchCustomerContacts: (customerId: string | null) => Promise<void>;
}

/**
 * Custom hook for fetching and managing user form dropdown data
 */
export function useUserFormData(): UseUserFormDataReturn {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerContactsForUserAssignment, setCustomerContactsForUserAssignment] = useState<CustomerContact[]>([]);
  const [allCustomersForManager, setAllCustomersForManager] = useState<CustomerForManager[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDropdowns(true);

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id, email')
        .order('last_name', { ascending: true });

      if (employeesError) {
        console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
        toast.error("Fehler beim Laden der Mitarbeiter.");
      }
      setEmployees(employeesData || []);

      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, user_id, contact_email')
        .order('name', { ascending: true });

      if (customersError) {
        console.error("Fehler beim Laden der Kunden:", customersError);
        toast.error("Fehler beim Laden der Kunden.");
      }
      setCustomers(customersData || []);

      // Fetch ALL customers for manager assignment
      const { data: allCustomersData, error: allCustomersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (allCustomersError) {
        console.error("Fehler beim Laden aller Kunden für Manager-Zuweisung:", allCustomersError);
        toast.error("Fehler beim Laden aller Kunden für Manager-Zuweisung.");
      }
      setAllCustomersForManager(allCustomersData || []);

      setLoadingDropdowns(false);
    };
    fetchData();
  }, [supabase]);

  // Fetch customer contacts for a specific customer
  const fetchCustomerContacts = useCallback(async (customerId: string | null) => {
    if (customerId) {
      const { data: contactsData, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('id, first_name, last_name, email, customer_id, user_id')
        .eq('customer_id', customerId)
        .order('last_name', { ascending: true });

      if (contactsError) {
        console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
        toast.error("Fehler beim Laden der Kundenkontakte.");
      }
      setCustomerContactsForUserAssignment(contactsData || []);
    } else {
      setCustomerContactsForUserAssignment([]);
    }
  }, [supabase]);

  return {
    employees,
    customers,
    customerContactsForUserAssignment,
    allCustomersForManager,
    loadingDropdowns,
    fetchCustomerContacts,
  };
}

/**
 * Hook for managing reassignment and unassign dialogs
 */
export interface ReassignmentState {
  type: 'employee' | 'customerContact';
  id: string;
  name: string;
}

export interface UnassignState {
  type: 'employee' | 'customerContact' | 'customer';
  id: string;
  name: string;
}

interface UseUserAssignmentDialogsReturn {
  showReassignmentDialog: boolean;
  setShowReassignmentDialog: (show: boolean) => void;
  pendingReassignment: ReassignmentState | null;
  handleReassignmentConfirm: (type: 'employee' | 'customerContact', id: string, name: string) => void;
  showUnassignDialog: boolean;
  setShowUnassignDialog: (show: boolean) => void;
  pendingUnassign: UnassignState | null;
  handleUnassignConfirm: (type: 'employee' | 'customerContact' | 'customer', id: string, name: string) => void;
}

export function useUserAssignmentDialogs(): UseUserAssignmentDialogsReturn {
  const [showReassignmentDialog, setShowReassignmentDialog] = useState(false);
  const [pendingReassignment, setPendingReassignment] = useState<ReassignmentState | null>(null);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [pendingUnassign, setPendingUnassign] = useState<UnassignState | null>(null);

  const handleReassignmentConfirm = useCallback((type: 'employee' | 'customerContact', id: string, name: string) => {
    setPendingReassignment({ type, id, name });
    setShowReassignmentDialog(true);
  }, []);

  const handleUnassignConfirm = useCallback((type: 'employee' | 'customerContact' | 'customer', id: string, name: string) => {
    setPendingUnassign({ type, id, name });
    setShowUnassignDialog(true);
  }, []);

  return {
    showReassignmentDialog,
    setShowReassignmentDialog,
    pendingReassignment,
    handleReassignmentConfirm,
    showUnassignDialog,
    setShowUnassignDialog,
    pendingUnassign,
    handleUnassignConfirm,
  };
}
