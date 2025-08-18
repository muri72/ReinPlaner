"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, StopCircle, PauseCircle, RotateCcw, PlusCircle } from "lucide-react";
import { createTimeEntry, updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateHours } from "@/lib/utils";
import { TimeEntryCreateDialog } from "@/components/time-entry-create-dialog";
import { TimeEntryFormValues } from "@/components/time-entry-form";
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeeTimeTrackerProps {
  userId: string;
}

interface ActiveTimeEntry {
  id: string;
  start_time: string;
  order_id: string | null;
  object_id: string | null;
  type: 'clock_in_out' | 'stopwatch';
  orders?: { title: string }[] | null;
  objects?: { name: string }[] | null;
  notes?: string | null;
}

export function EmployeeTimeTracker({ userId }: EmployeeTimeTrackerProps) {
  const supabase = createClient();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<{ id: string; title: string; customer_id: string; object_id: string; order_type: string }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'clock_in_out' | 'stopwatch'>('clock_in_out');

  const [suggestedStartTime, setSuggestedStartTime] = useState<string | null>(null);
  const [suggestedEndTime, setSuggestedEndTime] = useState<string | null>(null);
  const [suggestedDuration, setSuggestedDuration] = useState<number | null>(null);
  const [suggestedBreakMinutes, setSuggestedBreakMinutes] = useState<number | null>(null);

  const stopwatchElapsedTime = useRef(0); // Use ref for elapsed time
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [displayTime, setDisplayTime] = useState('00:00:00'); // State for displayed time

  // Helper to format time for display
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  };

  // Helper function to calculate break minutes based on gross duration (same as in reports/actions.ts)
  const calculateBreakMinutesFallback = (grossDurationMinutes: number): number => {
    if (grossDurationMinutes >= 9 * 60) {
      return 45;
    } else if (grossDurationMinutes >= 6 * 60) {
      return 30;
    }
    return 0;
  };

  // Fetch initial data and active entry
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error("Fehler beim Laden der Mitarbeiter-ID:", employeeError);
        toast.error("Fehler beim Laden Ihrer Mitarbeiterdaten.");
        setLoading(false);
        return;
      }

      const empId = employeeData?.id || null;
      setEmployeeId(empId);

      if (empId) {
        const { data: activeEntryData, error: activeEntryError } = await supabase
          .from('time_entries')
          .select(`
            id,
            start_time,
            order_id,
            object_id,
            notes,
            type,
            orders ( title ),
            objects ( name )
          `)
          .eq('employee_id', empId)
          .is('end_time', null)
          .single();

        if (activeEntryError && activeEntryError.code !== 'PGRST116') {
          console.error("Fehler beim Laden des aktiven Zeiteintrags:", activeEntryError);
          toast.error("Fehler beim Laden des aktiven Zeiteintrags.");
        } else if (activeEntryData) {
          setActiveEntry(activeEntryData as ActiveTimeEntry);
          setSelectedOrderId(activeEntryData.order_id);
          setCurrentTab(activeEntryData.type as 'clock_in_out' | 'stopwatch');

          if (activeEntryData.type === 'stopwatch') {
            const startTime = new Date(activeEntryData.start_time).getTime();
            stopwatchElapsedTime.current = Math.floor((Date.now() - startTime) / 1000);
            setDisplayTime(formatTime(stopwatchElapsedTime.current));
            stopwatchIntervalRef.current = setInterval(() => {
              stopwatchElapsedTime.current += 1;
              setDisplayTime(formatTime(stopwatchElapsedTime.current));
            }, 1000);
          }
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, title, customer_id, object_id, order_type, order_employee_assignments!inner(employee_id)')
          .eq('order_employee_assignments.employee_id', empId)
          .order('title', { ascending: true });

        if (ordersData) setOrders(ordersData);
        if (ordersError) console.error("Fehler beim Laden der Aufträge:", ordersError);
      }
      setLoading(false);
    };

    fetchInitialData();

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [userId, supabase]);

  // Effect to fetch object schedule for selected order (if object_id exists)
  useEffect(() => {
    const fetchObjectSchedule = async () => {
      setSuggestedStartTime(null);
      setSuggestedEndTime(null);
      setSuggestedDuration(null);
      setSuggestedBreakMinutes(null);

      if (selectedOrderId) {
        const selectedOrder = orders.find(o => o.id === selectedOrderId);
        if (selectedOrder && selectedOrder.object_id && selectedOrder.order_type === 'permanent') {
          const { data: objectData, error: objectError } = await supabase
            .from('objects')
            .select('monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, total_weekly_hours')
            .eq('id', selectedOrder.object_id)
            .single();

          if (objectError) {
            console.error("Fehler beim Laden des Objektplans:", objectError);
            return;
          }

          if (objectData) {
            const today = new Date();
            const dayOfWeek = today.getDay();

            let dailyHours: number | null = null;
            switch (dayOfWeek) {
              case 0: dailyHours = objectData.sunday_hours || null; break;
              case 1: dailyHours = objectData.monday_hours || null; break;
              case 2: dailyHours = objectData.tuesday_hours || null; break;
              case 3: dailyHours = objectData.wednesday_hours || null; break;
              case 4: dailyHours = objectData.thursday_hours || null; break;
              case 5: dailyHours = objectData.friday_hours || null; break;
              case 6: dailyHours = objectData.saturday_hours || null; break;
            }

            // If daily hours are defined for the object, use them as suggested duration
            if (dailyHours !== null) {
              setSuggestedDuration(Math.round(dailyHours * 60)); // Convert hours to minutes
              setSuggestedBreakMinutes(calculateBreakMinutesFallback(Math.round(dailyHours * 60)));
              // For simplicity, we're not deriving start/end times from object schedule here,
              // as the TimeEntryForm handles that based on object_id and date.
              // We're primarily suggesting the duration.
            }
          }
        }
      }
    };

    fetchObjectSchedule();
  }, [selectedOrderId, orders, supabase]);

  const handleClockOut = async () => {
    if (!activeEntry || activeEntry.type !== 'clock_in_out') {
      toast.error("Kein aktiver Stempeluhr-Eintrag zum Ausstempeln gefunden.");
      return;
    }
    setLoading(true);
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5);

    const startDateTime = new Date(activeEntry.start_time);
    const diffMs = now.getTime() - startDateTime.getTime();
    const durationMinutes = diffMs / (1000 * 60);
    const calculatedBreakMinutes = calculateBreakMinutesFallback(durationMinutes);

    const result = await updateTimeEntry(activeEntry.id, {
      endDate: now,
      endTime: endTime,
      durationMinutes: durationMinutes,
      breakMinutes: calculatedBreakMinutes,
      notes: `${activeEntry.notes || ''} Ausgestempelt um ${now.toLocaleTimeString()}`,
    });

    if (result.success) {
      toast.success("Erfolgreich ausgestempelt!");
      setActiveEntry(null);
      setSelectedOrderId(null);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleStopwatchStart = async () => {
    if (!employeeId) {
      toast.error("Keine Mitarbeiter-ID gefunden. Bitte stellen Sie sicher, dass Ihr Benutzer einem Mitarbeiter zugewiesen ist.");
      return;
    }
    if (activeEntry) {
      toast.error("Es ist bereits ein Zeiteintrag aktiv. Bitte stempeln Sie zuerst aus oder stoppen Sie die Stoppuhr.");
      return;
    }
    setLoading(true);
    const now = new Date();
    const startTime = now.toTimeString().slice(0, 5);

    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    const result = await createTimeEntry({
      employeeId: employeeId,
      startDate: now,
      startTime: startTime,
      endDate: null,
      endTime: null,
      durationMinutes: null,
      breakMinutes: null,
      type: 'stopwatch',
      orderId: selectedOrderId,
      objectId: selectedOrder?.object_id || null,
      notes: `Stoppuhr gestartet um ${now.toLocaleTimeString()}${selectedOrder ? ` für Auftrag ${selectedOrder.title}` : ''}`,
    });

    if (result.success && result.newEntryId) {
      toast.success("Stoppuhr gestartet!");
      setActiveEntry({
        id: result.newEntryId,
        start_time: now.toISOString(),
        order_id: selectedOrderId,
        object_id: selectedOrder?.object_id || null,
        type: 'stopwatch',
        notes: `Stoppuhr gestartet um ${now.toLocaleTimeString()}`,
      });
      stopwatchElapsedTime.current = 0;
      setDisplayTime('00:00:00');
      stopwatchIntervalRef.current = setInterval(() => {
        stopwatchElapsedTime.current += 1;
        setDisplayTime(formatTime(stopwatchElapsedTime.current));
      }, 1000);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleStopwatchStop = async () => {
    if (!activeEntry || activeEntry.type !== 'stopwatch') {
      toast.error("Keine aktive Stoppuhr zum Stoppen gefunden.");
      return;
    }
    setLoading(true);
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }

    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5);
    const startDateTime = new Date(activeEntry.start_time);
    const diffMs = now.getTime() - startDateTime.getTime();
    const durationMinutes = diffMs / (1000 * 60);
    const calculatedBreakMinutes = calculateBreakMinutesFallback(durationMinutes);

    const result = await updateTimeEntry(activeEntry.id, {
      endDate: now,
      endTime: endTime,
      durationMinutes: durationMinutes,
      breakMinutes: calculatedBreakMinutes,
      notes: `${activeEntry.notes || ''} Stoppuhr gestoppt um ${now.toLocaleTimeString()}`,
    });

    if (result.success) {
      toast.success("Stoppuhr gestoppt!");
      setActiveEntry(null);
      setSelectedOrderId(null);
      stopwatchElapsedTime.current = 0;
      setDisplayTime('00:00:00');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleStopwatchReset = () => {
    if (activeEntry && activeEntry.type === 'stopwatch') {
      toast.error("Bitte stoppen Sie die Stoppuhr, bevor Sie sie zurücksetzen.");
      return;
    }
    stopwatchElapsedTime.current = 0;
    setDisplayTime('00:00:00');
    toast.info("Stoppuhr zurückgesetzt.");
  };

  if (loading) {
    return (
      <Card className="p-4 space-y-4 shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ihre Zeiterfassung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!employeeId) {
    return (
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Zeiterfassung nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ihr Benutzerkonto ist keinem Mitarbeiter zugewiesen. Bitte kontaktieren Sie Ihren Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const isScheduledOrder = !!(selectedOrder && selectedOrder.order_type === 'permanent' && suggestedDuration !== null);

  const getInitialDataForDialog = (): Partial<TimeEntryFormValues> => {
    const now = new Date();
    const baseData: Partial<TimeEntryFormValues> = {
      employeeId: employeeId,
      customerId: selectedOrder?.customer_id || null,
      objectId: selectedOrder?.object_id || null,
      orderId: selectedOrderId,
      notes: selectedOrder ? `Zeiteintrag für Auftrag: ${selectedOrder.title}` : '',
    };

    if (isScheduledOrder) {
      return {
        ...baseData,
        startDate: now,
        startTime: suggestedStartTime || undefined, // Cast null to undefined
        endDate: now,
        endTime: suggestedEndTime || undefined, // Cast null to undefined
        durationMinutes: suggestedDuration,
        breakMinutes: suggestedBreakMinutes,
        type: 'automatic_scheduled_order' as const,
        notes: `Automatisch erfasster geplanter Auftrag: ${suggestedDuration !== null ? (suggestedDuration / 60).toFixed(2) : 'N/A'} Stunden`,
      };
    } else {
      return {
        ...baseData,
        startDate: now,
        startTime: now.toTimeString().slice(0, 5),
        endDate: null,
        endTime: null,
        durationMinutes: null,
        breakMinutes: null,
        type: 'clock_in_out' as const,
      };
    }
  };

  return (
    <Card className="p-4 space-y-4 shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ihre Zeiterfassung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeEntry && (
          <div className="space-y-2 mb-4 p-3 border rounded-md bg-success-foreground/10 dark:bg-success-foreground/20">
            <p className="text-base font-semibold text-success flex items-center">
              <Clock className="inline-block mr-2 h-5 w-5" />
              {activeEntry.type === 'clock_in_out' ? 'Sie sind eingestempelt!' : 'Stoppuhr läuft!'}
            </p>
            <p className="text-sm text-muted-foreground">
              Startzeit: {new Date(activeEntry.start_time).toLocaleTimeString()}
            </p>
            {activeEntry.order_id && (
              <p className="text-sm text-muted-foreground">
                Auftrag: {activeEntry.orders?.[0]?.title || activeEntry.order_id}
              </p>
            )}
            {activeEntry.object_id && (
              <p className="text-sm text-muted-foreground">
                Objekt: {activeEntry.objects?.[0]?.name || activeEntry.object_id}
              </p>
            )}
            {activeEntry.type === 'stopwatch' && (
              <p className="text-2xl font-bold text-primary">
                {displayTime}
              </p>
            )}
          </div>
        )}

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'clock_in_out' | 'stopwatch')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clock_in_out" disabled={!!activeEntry && activeEntry.type !== 'clock_in_out'}>Stempeluhr</TabsTrigger>
            <TabsTrigger value="stopwatch" disabled={!!activeEntry && activeEntry.type !== 'clock_in_out'}>Stoppuhr</TabsTrigger>
          </TabsList>
          <TabsContent value="clock_in_out" className="mt-4 space-y-4">
            {!activeEntry || activeEntry.type === 'clock_in_out' ? (
              <>
                <div>
                  <Label htmlFor="orderIdClockIn">Auftrag auswählen (optional)</Label>
                  <Select onValueChange={(value) => setSelectedOrderId(value === "unassigned" ? null : value)} value={selectedOrderId || "unassigned"} disabled={!!activeEntry}>
                    <SelectTrigger id="orderIdClockIn" className="w-full">
                      <SelectValue placeholder="Auftrag auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>{order.title} ({order.order_type === 'permanent' ? 'Permanent' : 'Einmalig'})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orders.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Keine Aufträge für Sie gefunden.
                    </p>
                  )}
                </div>

                {isScheduledOrder && suggestedDuration !== null && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-primary-foreground/10 dark:bg-primary-foreground/20">
                    <p>Vorgeschlagene Dauer für diesen Auftrag heute:</p>
                    <p className="font-semibold">{ (suggestedDuration / 60).toFixed(2)} Stunden</p>
                    {suggestedBreakMinutes !== null && suggestedBreakMinutes > 0 && (
                      <p className="text-xs mt-1">
                        Inkl. {suggestedBreakMinutes} Minuten Pause.
                      </p>
                    )}
                    <p className="text-xs mt-1">
                      Klicken Sie auf "Einstempeln", um diese Stunden zu bestätigen.
                    </p>
                  </div>
                )}

                {!activeEntry ? (
                  <TimeEntryCreateDialog
                    initialData={getInitialDataForDialog()}
                    triggerButtonText="Einstempeln"
                    triggerButtonIcon={<Play className="mr-2 h-4 w-4" />}
                    triggerButtonVariant="default"
                    triggerButtonClassName="w-full bg-success hover:bg-success/90"
                    dialogTitle={isScheduledOrder ? "Geplanten Zeiteintrag bestätigen" : "Neuen Zeiteintrag erstellen"}
                    onEntryCreated={() => {
                      supabase
                        .from('time_entries')
                        .select(`
                          id,
                          start_time,
                          order_id,
                          object_id,
                          notes,
                          type,
                          orders ( title ),
                          objects ( name )
                        `)
                        .eq('employee_id', employeeId)
                        .is('end_time', null)
                        .single()
                        .then(({ data: newActiveEntry, error }) => {
                          if (newActiveEntry) setActiveEntry(newActiveEntry as ActiveTimeEntry);
                          if (error && error.code !== 'PGRST116') console.error("Fehler beim Neuladen des aktiven Eintrags:", error);
                        });
                      setSelectedOrderId(null);
                    }}
                    currentUserId={userId}
                    isAdmin={false}
                  />
                ) : (
                  <Button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full bg-destructive hover:bg-destructive/90"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Ausstempeln
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Bitte stempeln Sie zuerst aus.
              </p>
            )}
          </TabsContent>
          <TabsContent value="stopwatch" className="mt-4 space-y-4">
            {!activeEntry || activeEntry.type === 'stopwatch' ? (
              <>
                <div>
                  <Label htmlFor="orderIdStopwatch">Auftrag auswählen (optional)</Label>
                  <Select onValueChange={(value) => setSelectedOrderId(value === "unassigned" ? null : value)} value={selectedOrderId || "unassigned"} disabled={!!activeEntry}>
                    <SelectTrigger id="orderIdStopwatch" className="w-full">
                      <SelectValue placeholder="Auftrag auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>{order.title} ({order.order_type === 'permanent' ? 'Permanent' : 'Einmalig'})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orders.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Keine Aufträge für Sie gefunden.
                    </p>
                  )}
                </div>

                {isScheduledOrder && suggestedDuration !== null && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-primary-foreground/10 dark:bg-primary-foreground/20">
                    <p>Vorgeschlagene Dauer für diesen Auftrag heute:</p>
                    <p className="font-semibold">{ (suggestedDuration / 60).toFixed(2)} Stunden</p>
                    {suggestedBreakMinutes !== null && suggestedBreakMinutes > 0 && (
                      <p className="text-xs mt-1">
                        Die Stoppuhr verfolgt die tatsächliche Zeit, aber dies ist der erwartete Zeitrahmen.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-center items-center text-3xl font-bold my-4">
                  {displayTime}
                </div>
                <div className="flex gap-2">
                  {!activeEntry ? (
                    <Button
                      onClick={handleStopwatchStart}
                      disabled={loading}
                      className="flex-1 bg-success hover:bg-success/90"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopwatchStop}
                      disabled={loading}
                      className="flex-1 bg-destructive hover:bg-destructive/90"
                    >
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  )}
                  <Button
                    onClick={handleStopwatchReset}
                    disabled={loading || !!activeEntry}
                    variant="outline"
                    className="w-auto"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Bitte stempeln Sie zuerst aus.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}