"use client";

import * as React from "react";
import { getPlanningDataForRange, PlanningPageData, reassignSingleOrder } from "@/app/dashboard/planning/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { assignOrderToEmployee, reassignRecurringOrder } from "./actions";
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { RecurringEditDialog } from "@/components/recurring-edit-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, AlertCircle, User, Briefcase, Plus, ChevronRight, MoreVertical, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PendingReassignment {
  assignmentId: string;
  originalDate: string;
  newEmployeeId: string;
  newDate: string;
}

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'day' | 'week' | 'month'>('week');
  const [showUnassigned, setShowUnassigned] = React.useState(true);
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const isMobile = useIsMobile();

  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = React.useState(false);
  const [pendingReassignment, setPendingReassignment] = React.useState<PendingReassignment | null>(null);

  const { startDate, endDate, daysToDisplay } = React.useMemo(() => {
    let start, end;
    switch (viewMode) {
      case 'day':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'week':
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return { startDate: start, endDate: end, daysToDisplay: eachDayOfInterval({ start, end }) };
  }, [currentDate, viewMode]);

  const fetchData = React.useCallback(async (start: Date, end: Date, searchQuery: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
    }

    const result = await getPlanningDataForRange(start, end, { query: searchQuery });
    if (result.success) {
      setPlanningPageData(result.data);
    } else {
      toast.error(result.message);
      console.error(result.message);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData(startDate, endDate, query);
  }, [startDate, endDate, query, fetchData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
  
    if (!over || active.id === over.id) return;
  
    const [newEmployeeId, newDate] = (over.id as string).split('__');
    if (!newEmployeeId || !newDate) return;
  
    const [dragType, dragId] = (active.id as string).split('__');
  
    if (dragType === 'unassigned') {
      const orderId = dragId;
      toast.info(`Weise Auftrag zu...`);
      const result = await assignOrderToEmployee(orderId, newEmployeeId, newDate, null);
      if (result.success) {
        toast.success(result.message);
        fetchData(startDate, endDate, query);
      } else {
        toast.error(result.message);
      }
    } else if (dragType === 'assignment') {
      const assignment = active.data.current?.assignment;
      if (!assignment) return;
  
      const assignmentId = assignment.id;
      const originalDate = Object.keys(planningPageData?.planningData[newEmployeeId]?.schedule || {}).find(date => 
        planningPageData?.planningData[newEmployeeId]?.schedule[date]?.assignments.some(a => a.id === assignmentId)
      ) || newDate;
  
      if (assignment.isRecurring) {
        setPendingReassignment({ assignmentId, originalDate, newEmployeeId, newDate });
        setIsRecurringDialogOpen(true);
      } else {
        toast.info("Verschiebe einmaligen Einsatz...");
        const result = await reassignSingleOrder(assignmentId, newEmployeeId, newDate);
        if (result.success) {
          toast.success(result.message);
          fetchData(startDate, endDate, query);
        } else {
          toast.error(result.message);
        }
      }
    }
  };

  const handleRecurringUpdate = async (updateType: 'single' | 'series') => {
    if (!pendingReassignment) return;
    
    toast.info(`Aktualisiere wiederkehrenden Auftrag...`);
    const result = await reassignRecurringOrder({ ...pendingReassignment, updateType });
    
    if (result.success) {
      toast.success(result.message);
      fetchData(startDate, endDate, query);
    } else {
      toast.error(result.message);
    }
    
    setPendingReassignment(null);
    setIsRecurringDialogOpen(false);
  };

  // Moderne mobile Ansicht
  if (isMobile) {
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    
    return (
      <DndContext
        onDragStart={({ active }) => setActiveDragId(active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
          {/* Modern Header */}
          <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
            <PlanningToolbar
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showUnassigned={showUnassigned}
              onShowUnassignedChange={setShowUnassigned}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              onActionSuccess={() => fetchData(startDate, endDate, query)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-100 text-sm">Unbesetzt</p>
                            <p className="text-2xl font-bold">{planningPageData?.unassignedOrders?.length || 0}</p>
                          </div>
                          <AlertCircle className="h-8 w-8 text-orange-200" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm">Mitarbeiter</p>
                            <p className="text-2xl font-bold">{Object.keys(planningPageData?.planningData || {}).length}</p>
                          </div>
                          <Users className="h-8 w-8 text-blue-200" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Unassigned Orders - Modern Card */}
                  {showUnassigned && planningPageData?.unassignedOrders && planningPageData.unassignedOrders.length > 0 && (
                    <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Offene Einsätze
                          </CardTitle>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {planningPageData.unassignedOrders.slice(0, 3).map((order) => (
                          <div key={order.id} className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{order.title}</h3>
                                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {order.total_estimated_hours || 0}h
                                    </span>
                                    {order.service_type && (
                                      <Badge variant="secondary" className="text-xs">
                                        {order.service_type}
                                      </Badge>
                                    )}
                                  </div>
                                  {order.due_date && (
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                      Fällig: {format(new Date(order.due_date), 'dd. MMM', { locale: de })}
                                    </p>
                                  )}
                                </div>
                                <Sheet>
                                  <SheetTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
                                    <SheetHeader>
                                      <SheetTitle className="text-left">Mitarbeiter zuweisen</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-6 space-y-3">
                                      {Object.entries(planningPageData?.planningData || {}).map(([employeeId, employee]) => (
                                        <div key={employeeId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                          <Avatar className="h-10 w-10">
                                            <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                                            <AvatarFallback className="text-sm">{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{employee.name}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                              Verfügbar: {employee.totalHoursAvailable.toFixed(1)}h
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => {
                                              assignOrderToEmployee(
                                                order.id,
                                                employeeId,
                                                order.due_date || todayString,
                                                null
                                              ).then((result) => {
                                                if (result.success) {
                                                  toast.success(result.message);
                                                  fetchData(startDate, endDate, query);
                                                } else {
                                                  toast.error(result.message);
                                                }
                                              });
                                            }}
                                          >
                                            Zuweisen
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </SheetContent>
                                </Sheet>
                              </div>
                            </div>
                          </div>
                        ))}
                        {planningPageData.unassignedOrders.length > 3 && (
                          <Button variant="outline" className="w-full rounded-xl">
                            Alle {planningPageData.unassignedOrders.length} Einsätze anzeigen
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Employee Timeline - Modern Design */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Team Übersicht
                    </h2>
                    
                    {Object.entries(planningPageData?.planningData || {}).map(([employeeId, employee]) => {
                      const todaySchedule = employee.schedule[todayString];
                      const isOverloaded = employee.totalHoursPlanned > employee.totalHoursAvailable;
                      const workloadPercentage = (employee.totalHoursPlanned / employee.totalHoursAvailable) * 100;
                      
                      return (
                        <Card key={employeeId} className="border-0 shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
                          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                                    <AvatarFallback className="text-sm font-semibold">{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  {isOverloaded && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{employee.name}</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{employee.raw.job_title || 'Mitarbeiter'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                  {employee.totalHoursPlanned.toFixed(1)}h
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">von {employee.totalHoursAvailable.toFixed(1)}h</p>
                              </div>
                            </div>

                            {/* Workload Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                                <span>Auslastung</span>
                                <span>{workloadPercentage.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    workloadPercentage > 100 ? "bg-red-500" : 
                                    workloadPercentage > 80 ? "bg-orange-500" : 
                                    "bg-gradient-to-r from-blue-500 to-purple-500"
                                  )}
                                  style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Today's Schedule */}
                            {todaySchedule && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Heute
                                </h4>
                                {todaySchedule.isAbsence ? (
                                  <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3">
                                    <Badge variant="secondary" className="text-xs">
                                      {todaySchedule.absenceType === 'vacation' ? '🏖️ Urlaub' :
                                       todaySchedule.absenceType === 'sick_leave' ? '🤒 Krank' :
                                       todaySchedule.absenceType === 'training' ? '📚 Weiterbildung' : '📅 Abwesend'}
                                    </Badge>
                                  </div>
                                ) : todaySchedule.assignments.length > 0 ? (
                                  <div className="space-y-2">
                                    {todaySchedule.assignments.map((assignment) => (
                                      <div key={assignment.id} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{assignment.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                                              <span>{assignment.hours}h</span>
                                              {assignment.service_type && (
                                                <Badge variant="outline" className="text-xs">
                                                  {assignment.service_type}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Keine Einsätze heute</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex-1 rounded-xl">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Wochenplan
                                  </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
                                  <SheetHeader>
                                    <SheetTitle className="text-left">Wochenplan - {employee.name}</SheetTitle>
                                  </SheetHeader>
                                  <div className="mt-6">
                                    <PlanningCalendar
                                      planningData={{ [employeeId]: employee }}
                                      unassignedOrders={[]}
                                      weekDays={daysToDisplay}
                                      activeDragId={activeDragId}
                                      showUnassigned={false}
                                      onActionSuccess={() => fetchData(startDate, endDate, query)}
                                      weekNumber={planningPageData?.weekNumber || 0}
                                    />
                                  </div>
                                </SheetContent>
                              </Sheet>
                              <Button variant="outline" size="sm" className="rounded-xl">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        <RecurringEditDialog
          open={isRecurringDialogOpen}
          onOpenChange={setIsRecurringDialogOpen}
          onConfirmSingle={() => handleRecurringUpdate('single')}
          onConfirmSeries={() => handleRecurringUpdate('series')}
        />
      </DndContext>
    );
  }

  // Desktop-Ansicht (bestehende Logik)
  return (
    <DndContext
      onDragStart={({ active }) => setActiveDragId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-8 space-y-4 h-full flex flex-col">
        <PlanningToolbar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showUnassigned={showUnassigned}
          onShowUnassignedChange={setShowUnassigned}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
          onActionSuccess={() => fetchData(startDate, endDate, query)}
        />
        <div className="flex-grow min-h-0">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <PlanningCalendar
              planningData={planningPageData?.planningData || {}}
              unassignedOrders={planningPageData?.unassignedOrders || []}
              weekDays={daysToDisplay}
              activeDragId={activeDragId}
              showUnassigned={showUnassigned}
              onActionSuccess={() => fetchData(startDate, endDate, query)}
              weekNumber={planningPageData?.weekNumber || 0}
            />
          )}
        </div>
      </div>
      <RecurringEditDialog
        open={isRecurringDialogOpen}
        onOpenChange={setIsRecurringDialogOpen}
        onConfirmSingle={() => handleRecurringUpdate('single')}
        onConfirmSeries={() => handleRecurringUpdate('series')}
      />
    </DndContext>
  );
}