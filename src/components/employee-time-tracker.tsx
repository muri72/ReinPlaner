"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, StopCircle, PauseCircle, RotateCcw } from "lucide-react";
import { createTimeEntry, updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateHours } from "@/lib/utils"; // Import calculateHours

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
  const [orders, setOrders] = useState<{ id: string; title: string; customer_id: string; object_id: string; order_type: string }[]>([]); // Added order_type
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'clock_in_out' | 'stopwatch'>('clock_in_out');

  // States for suggested times based on object schedule for permanent orders
  const [suggestedStartTime, setSuggestedStartTime] = useState<string | null>(null);
  const [suggestedEndTime, setSuggestedEndTime] = useState<string | null>(null);
  const [suggestedDuration, setSuggestedDuration] = useState<number | null>(null); // in minutes

  // Stopwatch specific states
  const [stopwatchElapsedTime, setStopwatchElapsedTime] = useState(0);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to format time for display
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  };

  // Fetch initial data and active entry
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      // 1. Mitarbeiter-ID für den aktuellen Benutzer abrufen
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
        // 2. Aktiven Zeiteintrag prüfen (egal welcher Typ)
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
            const now = Date.now();
            setStopwatchElapsedTime(Math.floor((now - startTime) / 1000));
            stopwatchIntervalRef.current = setInterval(() => {
              setStopwatchElapsedTime(prev => prev + 1);
            }, 1000);
          }
        }

        // 3. Aufträge zur Auswahl abrufen (inkl. order_type und object_id)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, title, customer_id, object_id, order_type') // Select order_type and object_id
          .eq('employee_id', empId)
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

  // Effect to fetch object schedule for selected permanent order
  useEffect(() => {
    const fetchObjectSchedule = async () => {
      setSuggestedStartTime(null);
      setSuggestedEndTime(null);
      setSuggestedDuration(null);

      if (selectedOrderId) {
        const selectedOrder = orders.find(o => o.id === selectedOrderId);
        if (selectedOrder && selectedOrder.order_type === 'permanent' && selectedOrder.object_id) {
          const { data: objectData, error: objectError } = await supabase
            .from('objects')
            .select('monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time')
            .eq('id', selectedOrder.object_id)
            .single();

          if (objectError) {
            console.error("Fehler beim Laden des Objektplans:", objectError);
            return;
          }

          if (objectData) {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            let startTimeKey: keyof typeof objectData | null = null;
            let endTimeKey: keyof typeof objectData | null = null;

            switch (dayOfWeek) {
              case 0: startTimeKey = 'sunday_start_time'; endTimeKey = 'sunday_end_time'; break;
              case 1: startTimeKey = 'monday_start_time'; endTimeKey = 'monday_end_time'; break;
              case 2: startTimeKey = 'tuesday_start_time'; endTimeKey = 'tuesday_end_time'; break;
              case 3: startTimeKey = 'wednesday_start_time'; endTimeKey = 'wednesday_end_time'; break;
              case 4: startTimeKey = 'thursday_start_time'; endTimeKey = 'thursday_end_time'; break;
              case 5: startTimeKey = 'friday_start_time'; endTimeKey = 'friday_end_time'; break;
              case 6: startTimeKey = 'saturday_start_time'; endTimeKey = 'saturday_end_time'; break;
            }

            const suggestedStart = startTimeKey ? objectData[startTimeKey] : null;
            const suggestedEnd = endTimeKey ? objectData[endTimeKey] : null;

            setSuggestedStartTime(suggestedStart);
            setSuggestedEndTime(suggestedEnd);

            if (suggestedStart && suggestedEnd) {
              const duration = calculateHours(suggestedStart, suggestedEnd);
              setSuggestedDuration(duration !== null ? Math.round(duration * 60) : null);
            }
          }
        }
      }
    };

    fetchObjectSchedule();
  }, [selectedOrderId, orders, supabase]);

  const handleClockIn = async () => {
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
    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    let actualStartTime = now.toTimeString().slice(0, 5);
    let actualEndTime: string | null = null;
    let actualDurationMinutes: number | null = null;
    let actualEndDate: Date | null = null;
    let notes = `Eingestempelt um ${now.toLocaleTimeString()}`;

    if (selectedOrder?.order_type === 'permanent' && suggestedStartTime && suggestedEndTime && suggestedDuration !== null) {
      // For permanent orders, automatically log the full scheduled duration
      actualStartTime = suggestedStartTime;
      actualEndTime = suggestedEndTime;
      actualDurationMinutes = suggestedDuration;
      actualEndDate = now; // End date is today
      notes = `Automatisch erfasst für permanenten Auftrag: ${actualStartTime} - ${actualEndTime}`;
      toast.info("Permanenter Auftrag: Geplante Stunden automatisch erfasst.");
    } else {
      // For other order types or no schedule, start a live clock
      notes = `Eingestempelt um ${now.toLocaleTimeString()}`;
    }

    const result = await createTimeEntry({
      employeeId: employeeId,
      startDate: now,
      startTime: actualStartTime,
      endDate: actualEndDate,
      endTime: actualEndTime,
      durationMinutes: actualDurationMinutes,
      type: 'clock_in_out',
      orderId: selectedOrderId,
      objectId: selectedOrder?.object_id || null,
      notes: notes,
    });

    if (result.success) {
      if (selectedOrder?.order_type === 'permanent' && suggestedStartTime && suggestedEndTime) {
        toast.success("Geplante Stunden für permanenten Auftrag erfolgreich erfasst!");
        setActiveEntry(null); // Entry is immediately completed
        setSelectedOrderId(null); // Clear selection
      } else {
        toast.success("Erfolgreich eingestempelt!");
        // Aktiven Eintrag neu abrufen, um die UI zu aktualisieren
        const { data: newActiveEntry, error } = await supabase
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
          .single();
        if (newActiveEntry) setActiveEntry(newActiveEntry as ActiveTimeEntry);
        if (error && error.code !== 'PGRST116') console.error("Fehler beim Neuladen des aktiven Eintrags:", error);
      }
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

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

    const result = await updateTimeEntry(activeEntry.id, {
      endDate: now,
      endTime: endTime,
      durationMinutes: durationMinutes,
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
      startTime: startTime, // Stopwatch always starts with current time
      endDate: null,
      endTime: null,
      durationMinutes: null,
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
      setStopwatchElapsedTime(0);
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchElapsedTime(prev => prev + 1);
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

    const result = await updateTimeEntry(activeEntry.id, {
      endDate: now,
      endTime: endTime,
      durationMinutes: durationMinutes,
      notes: `${activeEntry.notes || ''} Stoppuhr gestoppt um ${now.toLocaleTimeString()}`,
    });

    if (result.success) {
      toast.success("Stoppuhr gestoppt!");
      setActiveEntry(null);
      setSelectedOrderId(null);
      setStopwatchElapsedTime(0);
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
    setStopwatchElapsedTime(0);
    toast.info("Stoppuhr zurückgesetzt.");
  };

  if (loading) {
    return <div className="text-center py-4">Lade Zeiterfassung...</div>;
  }

  if (!employeeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zeiterfassung nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ihr Benutzerkonto ist keinem Mitarbeiter zugewiesen. Bitte kontaktieren Sie Ihren Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedOrderIsPermanent = orders.find(o => o.id === selectedOrderId)?.order_type === 'permanent';

  return (
    <Card className="p-4 space-y-4">
      <CardHeader>
        <CardTitle>Ihre Zeiterfassung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeEntry && (
          <div className="space-y-2 mb-4 p-3 border rounded-md bg-green-50 dark:bg-green-950">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center">
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
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatTime(stopwatchElapsedTime)}
              </p>
            )}
          </div>
        )}

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'clock_in_out' | 'stopwatch')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clock_in_out" disabled={!!activeEntry && activeEntry.type !== 'clock_in_out'}>Stempeluhr</TabsTrigger>
            <TabsTrigger value="stopwatch" disabled={!!activeEntry && activeEntry.type !== 'stopwatch'}>Stoppuhr</TabsTrigger>
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
                    <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für Sie gefunden.</p>
                  )}
                </div>

                {selectedOrderIsPermanent && suggestedStartTime && suggestedEndTime && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-blue-50 dark:bg-blue-950">
                    <p>Vorgeschlagene Zeiten für diesen permanenten Auftrag heute:</p>
                    <p className="font-semibold">{suggestedStartTime} - {suggestedEndTime} ({suggestedDuration !== null ? (suggestedDuration / 60).toFixed(2) : 'N/A'} Stunden)</p>
                    <p className="text-xs mt-1">Beim Einstempeln werden diese Stunden automatisch erfasst.</p>
                  </div>
                )}

                {!activeEntry ? (
                  <Button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Einstempeln
                  </Button>
                ) : (
                  <Button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Ausstempeln
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center">Bitte stoppen Sie zuerst die Stoppuhr.</p>
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
                    <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für Sie gefunden.</p>
                  )}
                </div>

                {selectedOrderIsPermanent && suggestedStartTime && suggestedEndTime && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-blue-50 dark:bg-blue-950">
                    <p>Vorgeschlagene Zeiten für diesen permanenten Auftrag heute:</p>
                    <p className="font-semibold">{suggestedStartTime} - {suggestedEndTime} ({suggestedDuration !== null ? (suggestedDuration / 60).toFixed(2) : 'N/A'} Stunden)</p>
                    <p className="text-xs mt-1">Die Stoppuhr verfolgt die tatsächliche Zeit, aber dies ist der erwartete Zeitrahmen.</p>
                  </div>
                )}

                <div className="flex justify-center items-center text-4xl font-bold my-4">
                  {formatTime(stopwatchElapsedTime)}
                </div>
                <div className="flex gap-2">
                  {!activeEntry ? (
                    <Button
                      onClick={handleStopwatchStart}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopwatchStop}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700"
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
              <p className="text-muted-foreground text-center">Bitte stempeln Sie zuerst aus.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}