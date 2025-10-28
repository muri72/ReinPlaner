"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { MobilePlanningCalendar } from "@/components/mobile-planning-calendar";
import { MobilePlanningToolbar } from "@/components/mobile-planning-toolbar";
import { MobileAssignmentCard } from "@/components/mobile-assignment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Calendar, 
  Users, 
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: 'completed' | 'in_progress' | 'pending' | 'future';
  service_type?: string;
  object_name?: string;
  employee_name?: string;
  customer_name?: string;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

interface UnassignedOrder {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  service_type?: string;
}

interface Employee {
  id: string;
  name: string;
  avatar_url?: string;
  totalHours: number;
  plannedHours: number;
  status: 'available' | 'busy' | 'off';
}

export default function MobilePlanningPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [assignments, setAssignments] = useState<{ [date: string]: Assignment[] }>({});
  const [unassignedOrders, setUnassignedOrders] = useState<UnassignedOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect("/login");
        return;
      }
      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);
    };

    const fetchPlanningData = async () => {
      if (!currentUser) return;

      setLoading(true);
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

      try {
        // Fetch assignments for week
        const { data: assignmentData } = await supabase
          .from('order_employee_assignments')
          .select(`
            orders(id, title, status, priority, due_date, service_type, notes),
            employees(id, name, avatar_url),
            objects(name)
          `)
          .eq('employees.user_id', currentUser.id)
          .gte('orders.due_date', weekStart.toISOString())
          .lte('orders.due_date', weekEnd.toISOString());

        // Fetch unassigned orders
        const { data: unassignedData } = await supabase
          .from('orders')
          .select('id, title, priority, due_date, service_type')
          .is('order_employee_assignments.order_id', 'is', null)
          .eq('request_status', 'approved')
          .gte('due_date', weekStart.toISOString())
          .lte('due_date', weekEnd.toISOString());

        // Fetch all employees for workload calculation
        const { data: employeeData } = await supabase
          .from('employees')
          .select('id, name, avatar_url, status')
          .eq('status', 'active');

        // Process assignments
        const processedAssignments: { [date: string]: Assignment[] } = {};
        const processedUnassignedOrders: UnassignedOrder[] = [];

        assignmentData?.forEach((item: any) => {
          const assignment: Assignment = {
            id: item.orders.id,
            title: item.orders.title,
            startTime: '09:00',
            endTime: '17:00',
            hours: 8,
            status: item.orders.status as any,
            service_type: item.orders.service_type,
            object_name: item.objects?.name || null,
            employee_name: item.employees?.name || null,
            priority: item.orders.priority as any,
            notes: item.orders.notes,
          };

          const dateKey = item.orders.due_date?.split('T')[0];
          if (dateKey) {
            if (!processedAssignments[dateKey]) {
              processedAssignments[dateKey] = [];
            }
            processedAssignments[dateKey].push(assignment);
          }
        });

        unassignedData?.forEach((item: any) => {
          const order: UnassignedOrder = {
            id: item.id,
            title: item.title,
            priority: item.priority as any,
            due_date: item.due_date,
            service_type: item.service_type,
          };
          processedUnassignedOrders.push(order);
        });

        // Process employees with workload
        const processedEmployees: Employee[] = employeeData?.map((emp: any) => {
          const employeeAssignments = assignmentData?.filter(
            (item: any) => item.employees.id === emp.id
          ) || [];

          const totalHours = 40; // Standard 40h week
          const plannedHours = employeeAssignments.reduce((total: number, assignment: any) => {
            return total + (assignment.hours || 8);
          }, 0);

          return {
            id: emp.id,
            name: emp.name,
            avatar_url: emp.avatar_url,
            totalHours,
            plannedHours,
            status: plannedHours >= totalHours ? 'busy' : plannedHours > 0 ? 'available' : 'off',
          };
        }) || [];

        setAssignments(processedAssignments);
        setUnassignedOrders(processedUnassignedOrders);
        setEmployees(processedEmployees);
      } catch (error) {
        console.error('Error fetching planning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchPlanningData();
    }
  }, [currentUser, currentDate]);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setViewMode(mode as 'day' | 'week');
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId === selectedEmployee ? null : employeeId);
  };

  const handleFilterToggle = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    console.log('Export planning data');
  };

  const stats = {
    totalAssignments: Object.values(assignments).flat().length,
    completedAssignments: Object.values(assignments).flat().filter(a => a.status === 'completed').length,
    unassignedCount: unassignedOrders.length,
    totalEmployees: employees.length,
    availableEmployees: employees.filter(e => e.status === 'available').length,
  };

  const filters = [
    { id: 'pending', label: 'Ausstehend', icon: <AlertTriangle className="h-4 w-4" />, count: stats.unassignedCount },
    { id: 'in_progress', label: 'Aktiv', icon: <TrendingUp className="h-4 w-4" />, count: stats.totalAssignments - stats.completedAssignments },
    { id: 'completed', label: 'Erledigt', icon: <Calendar className="h-4 w-4" />, count: stats.completedAssignments },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-r-transparent border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Lade Planungsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MobilePlanningToolbar
        currentDate={currentDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        notificationCount={0}
        employees={employees}
        selectedEmployee={selectedEmployee}
        onEmployeeSelect={handleEmployeeSelect}
        filters={filters}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
        onClearFilters={handleClearFilters}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Stats Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="glassmorphism-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalAssignments}</div>
              <div className="text-sm text-muted-foreground">Gesamte Einsätze</div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedAssignments}</div>
              <div className="text-sm text-muted-foreground">Erledigt</div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unassignedCount}</div>
              <div className="text-sm text-muted-foreground">Unbesetzt</div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.availableEmployees}</div>
              <div className="text-sm text-muted-foreground">Verfügbar</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-20">
        <MobilePlanningCalendar
          currentDate={currentDate}
          onDateChange={handleDateChange}
          assignments={assignments}
          unassignedOrders={unassignedOrders}
          employees={employees}
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={handleEmployeeSelect}
        />
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => console.log('Create new assignment')}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg mobile-tap-target"
          size="lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}