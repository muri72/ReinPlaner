"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { MobileDashboardLayout } from "@/components/mobile-dashboard-layout";
import { MobileTimeEntry } from "@/components/mobile-time-entry";
import { MobileCalendar } from "@/components/mobile-calendar";
import { MobileQuickActions } from "@/components/mobile-quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Calendar, TrendingUp } from "lucide-react";
import { format, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";

interface DashboardStats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  activeAssignments: number;
  completedAssignments: number;
  pendingNotifications: number;
}

interface OrderAssignment {
  orders: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    service_type: string | null;
  };
  employees: {
    first_name: string;
    last_name: string;
  };
}

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    pendingNotifications: 0,
  });
  const [assignments, setAssignments] = useState<{ [date: string]: any[] }>({});
  const [currentDate, setCurrentDate] = useState(new Date());

  const supabase = createClient();

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

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    // Fetch time entries for stats
    const today = startOfDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('start_time, end_time, duration_minutes, break_minutes')
      .eq('user_id', currentUser.id)
      .gte('start_time', monthStart.toISOString());

    // Calculate stats
    const todayEntries = timeEntries?.filter(entry => 
      new Date(entry.start_time) >= today
    ) || [];
    const todayHours = todayEntries.reduce((sum, entry) => 
      sum + ((entry.duration_minutes || 0) - (entry.break_minutes || 0)) / 60, 0
    );

    const weekEntries = timeEntries?.filter(entry => 
      new Date(entry.start_time) >= weekStart
    ) || [];
    const weekHours = weekEntries.reduce((sum, entry) => 
      sum + ((entry.duration_minutes || 0) - (entry.break_minutes || 0)) / 60, 0
    );

    const monthHours = timeEntries?.reduce((sum, entry) => 
      sum + ((entry.duration_minutes || 0) - (entry.break_minutes || 0)) / 60, 0
    );

    // Fetch assignments
    const { data: orderAssignments } = await supabase
      .from('order_employee_assignments')
      .select(`
        orders(id, title, status, due_date, service_type),
        employees(first_name, last_name)
      `)
      .eq('employees.user_id', currentUser.id);

    const activeAssignments = orderAssignments?.filter((a: any) => 
      a.orders.status === 'in_progress'
    ).length || 0;

    const completedAssignments = orderAssignments?.filter((a: any) => 
      a.orders.status === 'completed'
    ).length || 0;

    // Fetch notifications
    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    setStats({
      todayHours,
      weekHours,
      monthHours: monthHours || 0,
      activeAssignments,
      completedAssignments,
      pendingNotifications: notificationCount || 0,
    });

    // Process assignments for calendar
    const processedAssignments: { [date: string]: any[] } = {};
    orderAssignments?.forEach((assignment: any) => {
      if (assignment.orders.due_date) {
        const date = format(new Date(assignment.orders.due_date), 'yyyy-MM-dd');
        if (!processedAssignments[date]) {
          processedAssignments[date] = [];
        }
        processedAssignments[date].push({
          id: assignment.orders.id,
          title: assignment.orders.title,
          startTime: '09:00',
          endTime: '17:00',
          hours: 8,
          status: assignment.orders.status,
          service_type: assignment.orders.service_type,
        });
      }
    });

    setAssignments(processedAssignments);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const handleNewTimeEntry = () => {
    // Navigate to time entry or open quick entry
    console.log('New time entry');
  };

  const handleViewSchedule = () => {
    // Navigate to schedule
    console.log('View schedule');
  };

  return (
    <MobileDashboardLayout
      currentUserRole="employee"
      onSignOut={async () => {
        await supabase.auth.signOut();
        redirect("/login");
      }}
      userProfile={userProfile}
      notificationCount={stats.pendingNotifications}
    >
      <div className="space-y-4">
        {/* Welcome Header */}
        <Card className="glassmorphism-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Willkommen zurück, {userProfile?.first_name || 'Mitarbeiter'}!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glassmorphism-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Heute
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.todayHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">Stunden</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Woche
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.weekHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">Stunden</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="glassmorphism-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Monat
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.monthHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">Stunden</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Aufträge
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-around">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {stats.completedAssignments}
                  </div>
                  <div className="text-xs text-muted-foreground">Erledigt</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {stats.activeAssignments}
                  </div>
                  <div className="text-xs text-muted-foreground">Aktiv</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Time Entry */}
        <MobileTimeEntry
          currentUserId={currentUser?.id}
          isAdmin={false}
          onEntryCreated={() => {
            // Refresh stats
            window.location.reload();
          }}
        />

        {/* Mobile Calendar */}
        <MobileCalendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          assignments={assignments}
          onAssignmentClick={(assignment) => {
            console.log('Assignment clicked:', assignment);
          }}
        />

        {/* Quick Actions */}
        <MobileQuickActions
          onStartTimeEntry={handleNewTimeEntry}
          onViewSchedule={handleViewSchedule}
          notificationCount={stats.pendingNotifications}
          pendingTasksCount={stats.activeAssignments}
        />
      </div>
    </MobileDashboardLayout>
  );
}