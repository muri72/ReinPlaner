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
import { Calendar, Users, Clock, AlertCircle, User, Briefcase } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  // Mobile-optimierte Ansicht
  if (isMobile) {
    const today = new Date().toISOString().split('T')[0];
    
    return (
      <DndContext
        onDragStart={({ active }) => setActiveDragId(active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="p-2 md:p-4 space-y-4 h-full flex flex-col">
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
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {/* Unbesetzte Einsätze */}
                  {showUnassigned && planningPageData?.unassignedOrders && planningPageData.unassignedOrders.length > 0 && (
                    <Card className="shadow-neumorphic glassmorphism-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          Unbesetzte Einsätze ({planningPageData.unassignedOrders.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {planningPageData.unassignedOrders.map((order) => (
                          <div key={order.id} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{order.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {order.service_type} • {order.total_estimated_hours || 0}h
                                </p>
                                {order.due_date && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {new Date(order.due_date).toLocaleDateString('de-DE')}
                                  </Badge>
                                )}
                              </div>
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Users className="h-4 w-4" />
                                  </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="h-[80vh]">
                                  <SheetHeader>
                                    <SheetTitle>Mitarbeiter zuweisen</SheetTitle>
                                  </SheetHeader>
                                  <div className="mt-4 space-y-4">
                                    {Object.entries(planningPageData?.planningData || {}).map(([employeeId, employee]) => (
                                      <Card key={employeeId} className="cursor-pointer hover:bg-accent/50 transition-colors">
                                        <CardContent className="p-3">
                                          <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="h-8 w-8">
                                                <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                                                <AvatarFallback className="text-xs">{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-medium text-sm">{employee.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  Verfügbar: {employee.totalHoursAvailable.toFixed(1)}h
                                                </p>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                assignOrderToEmployee(
                                                  order.id,
                                                  employeeId,
                                                  order.due_date || new Date().toISOString().split('T')[0],
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
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </SheetContent>
                              </Sheet>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Mitarbeiterübersicht */}
                  {Object.entries(planningPageData?.planningData || {}).map(([employeeId, employee]) => {
                    const todaySchedule = employee.schedule[today];
                    const isOverloaded = employee.totalHoursPlanned > employee.totalHoursAvailable;
                    
                    return (
                      <Card key={employeeId} className="shadow-neumorphic glassmorphism-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                                <AvatarFallback className="text-xs">{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <span>{employee.name}</span>
                            </div>
                            {isOverloaded && (
                              <Badge variant="destructive" className="text-xs">
                                Überlastet
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Arbeitslast-Anzeige */}
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Geplant: {employee.totalHoursPlanned.toFixed(1)}h</span>
                            <span>Verfügbar: {employee.totalHoursAvailable.toFixed(1)}h</span>
                          </div>
                          
                          {/* Heute */}
                          {todaySchedule && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-3 w-3" />
                                <span className="text-xs font-medium">Heute</span>
                              </div>
                              
                              {todaySchedule.isAbsence ? (
                                <Badge variant="secondary" className="text-xs">
                                  {todaySchedule.absenceType === 'vacation' ? 'Urlaub' :
                                   todaySchedule.absenceType === 'sick_leave' ? 'Krank' :
                                   todaySchedule.absenceType === 'training' ? 'Weiterbildung' : 'Abwesend'}
                                </Badge>
                              ) : todaySchedule.assignments.length > 0 ? (
                                <div className="space-y-2">
                                  {todaySchedule.assignments.map((assignment) => (
                                    <div key={assignment.id} className="p-2 bg-background rounded border text-xs">
                                      <p className="font-medium">{assignment.title}</p>
                                      <p className="text-muted-foreground">
                                        {assignment.hours}h • {assignment.service_type || 'Kein Typ'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Keine Einsätze</p>
                              )}
                            </div>
                          )}
                          
                          {/* Wochenübersicht Button */}
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full">
                                <Clock className="h-3 w-3 mr-2" />
                                Wochenplan anzeigen
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[90vh]">
                              <SheetHeader>
                                <SheetTitle>Wochenplan - {employee.name}</SheetTitle>
                              </SheetHeader>
                              <div className="mt-4">
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
                        </CardContent>
                      </Card>
                    );
                  })}
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