"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, StopCircle, PauseCircle, RotateCcw, PlusCircle, CalendarDays } from "lucide-react";
import { createTimeEntry, updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateHours, calculateEndTime, formatDuration } from "@/lib/utils";
import { TimeEntryCreateDialog } from "@/components/time-entry-create-dialog";
import { TimeEntryFormValues } from "@/components/time-entry-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeek } from "date-fns";
import { cn } from "@/lib/utils";

// Import extracted utilities and hooks
import { formatLiveTime, calculateDistance, calculateBreakMinutesFallback, isLocationValid } from "@/lib/utils/time-tracking-utils";
import { useTimeTracker, useActiveTimeEntry, useLocationTracking } from "@/hooks/use-time-tracker";
import { TimeProgressDisplay } from "@/components/time-tracking/time-progress-display";

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

interface OrderWithDetails {
  id: string;
  title: string;
  customer_id: string;
  object_id: string | null;
  order_type: string;
  start_date: string | null;
  end_date: string | null;
  object: {
    name: string;
    recurrence_interval_weeks: number;
    start_week_offset: number;
    monday_hours: number | null;
    tuesday_hours: number | null;
    wednesday_hours: number | null;
    thursday_hours: number | null;
    friday_hours: number | null;
    saturday_hours: number | null;
    sunday_hours: number | null;
    monday_start_time: string | null;
    tuesday_start_time: string | null;
    wednesday_start_time: string | null;
    thursday_start_time: string | null;
    friday_start_time: string | null;
    saturday_start_time: string | null;
    sunday_start_time: string | null;
    monday_end_time: string | null;
    tuesday_end_time: string | null;
    wednesday_end_time: string | null;
    thursday_end_time: string | null;
    friday_end_time: string | null;
    saturday_end_time: string | null;
    sunday_end_time: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radius_meters?: number | null;
  } | null;
  assigned_recurrence_interval_weeks: number | null;
  assigned_start_week_offset: number | null;
  assigned_monday_hours: number | null;
  assigned_tuesday_hours: number | null;
  assigned_wednesday_hours: number | null;
  assigned_thursday_hours: number | null;
  assigned_friday_hours: number | null;
  assigned_saturday_hours: number | null;
  assigned_sunday_hours: number | null;
  assigned_monday_start_time: string | null;
  assigned_tuesday_start_time: string | null;
  assigned_wednesday_start_time: string | null;
  assigned_thursday_start_time: string | null;
  assigned_friday_start_time: string | null;
  assigned_saturday_start_time: string | null;
  assigned_sunday_start_time: string | null;
  assigned_monday_end_time: string | null;
  assigned_tuesday_end_time: string | null;
  assigned_wednesday_end_time: string | null;
  assigned_thursday_end_time: string | null;
  assigned_friday_end_time: string | null;
  assigned_saturday_end_time: string | null;
  assigned_sunday_end_time: string | null;
}

export function EmployeeTimeTracker({ userId }: EmployeeTimeTrackerProps) {
  const supabase = createClient();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<string | null>(null); // New state for employee status
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'clock_in_out' | 'stopwatch'>('clock_in_out');

  const [suggestedStartTime, setSuggestedStartTime] = useState<string | null>(null);
  const [suggestedEndTime, setSuggestedEndTime] = useState<string | null>(null);
  const [suggestedDuration, setSuggestedDuration] = useState<number | null>(null);
  const [suggestedBreakMinutes, setSuggestedBreakMinutes] = useState<number | null>(null);
  const [recurrenceInfo, setRecurrenceInfo] = useState<string | null>(null);

  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDeviation, setLocationDeviation] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopwatchElapsedTime = useRef(0);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [displayTime, setDisplayTime] = useState('00:00:00');

  // Helper to format seconds into HH:MM:SS for live display
  const formatLiveTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // New component for displaying time progress
  const TimeProgressDisplay = ({ plannedMinutes, actualSeconds }: { plannedMinutes: number | null, actualSeconds: number }) => {
    if (plannedMinutes === null || plannedMinutes <= 0) return null;

    const plannedSeconds = plannedMinutes * 60;
    const progressPercentage = plannedSeconds > 0 ? (actualSeconds / plannedSeconds) * 100 : 0;
    const isOvertime = actualSeconds > plannedSeconds;

    return (
      <div className="space-y-2 pt-2 mt-2 border-t">
        <div className="flex justify-between text-sm font-medium">
          <span>Tatsächliche Zeit: {formatLiveTime(actualSeconds)}</span>
          <span>Geplante Zeit: {formatDuration(plannedMinutes)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <div
            className={cn(
              "h-4 rounded-full transition-all duration-500",
              isOvertime ? "bg-destructive" : "bg-success"
            )}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        {isOvertime && (
          <p className="text-xs text-destructive text-center font-semibold">
            Überstunden: {formatLiveTime(actualSeconds - plannedSeconds)}
          </p>
        )}
      </div>
    );
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

  // Effect for the live timer of an active clock-in/out entry
  useEffect(() => {
    if (activeEntry && activeEntry.type === 'clock_in_out') {
      const updateElapsedTime = () => {
        const startTime = new Date(activeEntry.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };

      updateElapsedTime(); // Initial update
      intervalRef.current = setInterval(updateElapsedTime, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setElapsedTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [activeEntry]);

  // Fetch initial data and active entry
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, status') // Fetch status
        .eq('user_id', userId)
        .single();

      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error("Fehler beim Laden der Mitarbeiter-ID:", employeeError);
        toast.error("Fehler beim Laden Ihrer Mitarbeiterdaten.");
        setLoading(false);
        return;
      }

      const empId = employeeData?.id || null;
      const empStatus = employeeData?.status || null; // Get employee status
      setEmployeeId(empId);
      setEmployeeStatus(empStatus); // Set employee status

      if (empId && (empStatus === 'active' || empStatus === 'on_leave')) { // Only fetch orders if employee is active or on_leave
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
            setDisplayTime(formatLiveTime(stopwatchElapsedTime.current));
            stopwatchIntervalRef.current = setInterval(() => {
              stopwatchElapsedTime.current += 1;
              setDisplayTime(formatLiveTime(stopwatchElapsedTime.current));
            }, 1000);
          }
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id, title, customer_id, object_id, order_type, start_date, end_date,
            objects ( name, recurrence_interval_weeks, start_week_offset, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, monday_start_time, tuesday_start_time, wednesday_start_time, thursday_start_time, friday_start_time, saturday_start_time, sunday_start_time, monday_end_time, tuesday_end_time, wednesday_end_time, thursday_end_time, friday_end_time, saturday_end_time, sunday_end_time ),
            order_employee_assignments!inner ( 
              employee_id, assigned_recurrence_interval_weeks, assigned_start_week_offset,
              assigned_monday_hours, assigned_tuesday_hours, assigned_wednesday_hours, assigned_thursday_hours,
              assigned_friday_hours, assigned_saturday_hours, assigned_sunday_hours,
              assigned_monday_start_time, assigned_tuesday_start_time, assigned_wednesday_start_time, assigned_thursday_start_time,
              assigned_friday_start_time, assigned_saturday_start_time, assigned_sunday_start_time,
              assigned_monday_end_time, assigned_tuesday_end_time, assigned_wednesday_end_time, assigned_thursday_end_time,
              assigned_friday_end_time, assigned_saturday_end_time, assigned_sunday_end_time
            )
          `)
          .eq('order_employee_assignments.employee_id', empId)
          .eq('request_status', 'approved') // Only show approved orders
          .order('title', { ascending: true });

        if (ordersData) {
          const mappedOrders: OrderWithDetails[] = ordersData.map(order => ({
            id: order.id,
            title: order.title,
            customer_id: order.customer_id,
            object_id: order.object_id,
            order_type: order.order_type,
            start_date: order.start_date,
            end_date: order.end_date,
            object: Array.isArray(order.objects) ? order.objects[0] : order.objects,
            assigned_recurrence_interval_weeks: order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks || null,
            assigned_start_week_offset: order.order_employee_assignments?.[0]?.assigned_start_week_offset || null,
            assigned_monday_hours: order.order_employee_assignments?.[0]?.assigned_monday_hours || null,
            assigned_tuesday_hours: order.order_employee_assignments?.[0]?.assigned_tuesday_hours || null,
            assigned_wednesday_hours: order.order_employee_assignments?.[0]?.assigned_wednesday_hours || null,
            assigned_thursday_hours: order.order_employee_assignments?.[0]?.assigned_thursday_hours || null,
            assigned_friday_hours: order.order_employee_assignments?.[0]?.assigned_friday_hours || null,
            assigned_saturday_hours: order.order_employee_assignments?.[0]?.assigned_saturday_hours || null,
            assigned_sunday_hours: order.order_employee_assignments?.[0]?.assigned_sunday_hours || null,
            assigned_monday_start_time: order.order_employee_assignments?.[0]?.assigned_monday_start_time || null,
            assigned_tuesday_start_time: order.order_employee_assignments?.[0]?.assigned_tuesday_start_time || null,
            assigned_wednesday_start_time: order.order_employee_assignments?.[0]?.assigned_wednesday_start_time || null,
            assigned_thursday_start_time: order.order_employee_assignments?.[0]?.assigned_thursday_start_time || null,
            assigned_friday_start_time: order.order_employee_assignments?.[0]?.assigned_friday_start_time || null,
            assigned_saturday_start_time: order.order_employee_assignments?.[0]?.assigned_saturday_start_time || null,
            assigned_sunday_start_time: order.order_employee_assignments?.[0]?.assigned_sunday_start_time || null,
            assigned_monday_end_time: order.order_employee_assignments?.[0]?.assigned_monday_end_time || null,
            assigned_tuesday_end_time: order.order_employee_assignments?.[0]?.assigned_tuesday_end_time || null,
            assigned_wednesday_end_time: order.order_employee_assignments?.[0]?.assigned_wednesday_end_time || null,
            assigned_thursday_end_time: order.order_employee_assignments?.[0]?.assigned_thursday_end_time || null,
            assigned_friday_end_time: order.order_employee_assignments?.[0]?.assigned_friday_end_time || null,
            assigned_saturday_end_time: order.order_employee_assignments?.[0]?.assigned_saturday_end_time || null,
            assigned_sunday_end_time: order.order_employee_assignments?.[0]?.assigned_sunday_end_time || null,
          }));
          setOrders(mappedOrders);
        }
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

  // Effect to fetch employee's specific assignment schedule for the selected order
  useEffect(() => {
    const fetchAssignmentSchedule = async () => {
      setSuggestedStartTime(null);
      setSuggestedEndTime(null);
      setSuggestedDuration(null);
      setSuggestedBreakMinutes(null);
      setRecurrenceInfo(null);

      if (selectedOrderId && employeeId) {
        const selectedOrder = orders.find(o => o.id === selectedOrderId);

        if (selectedOrder) {
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0=So, 1=Mo, ...
          const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDayKey = dayKeys[dayOfWeek];

          // Determine recurrence from assignment or object
          const recurrenceIntervalWeeks = selectedOrder.assigned_recurrence_interval_weeks || selectedOrder.object?.recurrence_interval_weeks || 1;
          const startWeekOffset = selectedOrder.assigned_start_week_offset || selectedOrder.object?.start_week_offset || 0;

          if (recurrenceIntervalWeeks > 1) {
            const orderStartDate = selectedOrder.start_date ? new Date(selectedOrder.start_date) : (selectedOrder.end_date ? new Date(selectedOrder.end_date) : today);
            const startWeekNumber = getWeek(orderStartDate, { weekStartsOn: 1 });
            const currentWeekNumber = getWeek(today, { weekStartsOn: 1 });
            const weekDifference = currentWeekNumber - startWeekNumber;

            if (weekDifference % recurrenceIntervalWeeks !== startWeekOffset) {
              setRecurrenceInfo(`Dieser Auftrag ist nicht für diese Woche geplant (Alle ${recurrenceIntervalWeeks} Wochen, Offset ${startWeekOffset}).`);
              return;
            } else {
              setRecurrenceInfo(`Dieser Auftrag ist für diese Woche geplant (Alle ${recurrenceIntervalWeeks} Wochen, Offset ${startWeekOffset}).`);
            }
          } else {
            setRecurrenceInfo(null);
          }

          // Prioritize assigned hours/times, then fallback to object hours/times
          const netHoursFromSchedule = (selectedOrder as any)[`assigned_${currentDayKey}_hours`] || (selectedOrder.object as any)?.[`${currentDayKey}_hours`];
          let grossStartTimeFromSchedule = (selectedOrder as any)[`assigned_${currentDayKey}_start_time`] || (selectedOrder.object as any)?.[`${currentDayKey}_start_time`];
          let grossEndTimeFromSchedule = (selectedOrder as any)[`assigned_${currentDayKey}_end_time`] || (selectedOrder.object as any)?.[`${currentDayKey}_end_time`];


          if (netHoursFromSchedule !== null && netHoursFromSchedule > 0) {
            const netMinutes = Math.round(netHoursFromSchedule * 60);
            const calculatedBreakMinutes = calculateBreakMinutesFallback(netMinutes); // Break based on NET hours
            const grossMinutesToStore = netMinutes + calculatedBreakMinutes;

            setSuggestedDuration(grossMinutesToStore);
            setSuggestedBreakMinutes(calculatedBreakMinutes);
            setSuggestedStartTime(grossStartTimeFromSchedule);
            
            // Calculate suggestedEndTime based on suggestedStartTime and grossMinutesToStore
            if (grossStartTimeFromSchedule) {
              setSuggestedEndTime(calculateEndTime(grossStartTimeFromSchedule, grossMinutesToStore / 60));
            } else {
              setSuggestedEndTime(null);
            }
          }

          // Check location deviation
          if (currentLocation && selectedOrder.object?.latitude && selectedOrder.object?.longitude && selectedOrder.object?.radius_meters !== null) {
            const distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              selectedOrder.object.latitude,
              selectedOrder.object.longitude
            );
            if (distance > selectedOrder.object.radius_meters!) {
              setLocationDeviation(true);
              toast.warning(`Sie sind ${Math.round(distance - selectedOrder.object.radius_meters!)}m außerhalb des Objekt-Radius.`);
            } else {
              setLocationDeviation(false);
            }
          } else if (selectedOrder.object?.name) {
            setLocationError(null);
          }
        }
      }
    };

    fetchAssignmentSchedule();
  }, [selectedOrderId, employeeId, orders, supabase]);

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
      setRecurrenceInfo(null);
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
      setDisplayTime(formatLiveTime(stopwatchElapsedTime.current));
      stopwatchIntervalRef.current = setInterval(() => {
        stopwatchElapsedTime.current += 1;
        setDisplayTime(formatLiveTime(stopwatchElapsedTime.current));
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
      setRecurrenceInfo(null);
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

  if (!employeeId || (employeeStatus !== 'active' && employeeStatus !== 'on_leave')) {
    return (
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Zeiterfassung nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ihr Benutzerkonto ist keinem aktiven Mitarbeiter zugewiesen oder Ihr Mitarbeiterstatus ist nicht 'aktiv' oder 'im Urlaub'. Bitte kontaktieren Sie Ihren Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const isScheduledOrder = !!(selectedOrder && suggestedDuration !== null && !recurrenceInfo); // Only if no recurrence conflict

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
        notes: `Automatisch erfasster geplanter Auftrag: ${suggestedDuration !== null && suggestedBreakMinutes !== null ? ((suggestedDuration - suggestedBreakMinutes) / 60).toFixed(2) : 'N/A'} Netto-Stunden`,
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
            {activeEntry.type === 'clock_in_out' && (
              <TimeProgressDisplay
                plannedMinutes={suggestedDuration !== null && suggestedBreakMinutes !== null ? suggestedDuration - suggestedBreakMinutes : null}
                actualSeconds={elapsedTime}
              />
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

                {recurrenceInfo && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-warning/10 dark:bg-warning/20 flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <p>{recurrenceInfo}</p>
                  </div>
                )}

                {isScheduledOrder && suggestedDuration !== null && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-primary-foreground/10 dark:bg-primary-foreground/20">
                    <p>Vorgeschlagene Dauer für diesen Auftrag heute:</p>
                    <p className="font-semibold">{ suggestedDuration !== null && suggestedBreakMinutes !== null ? ((suggestedDuration - suggestedBreakMinutes) / 60).toFixed(2) : 'N/A'} Netto-Stunden</p>
                    {suggestedBreakMinutes !== null && suggestedBreakMinutes > 0 && (
                      <p className="text-xs mt-1">
                        Die Stoppuhr verfolgt die tatsächliche Zeit, aber dies ist der erwartete Zeitrahmen.
                      </p>
                    )}
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
                      setRecurrenceInfo(null);
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

                {recurrenceInfo && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-warning/10 dark:bg-warning/20 flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <p>{recurrenceInfo}</p>
                  </div>
                )}

                {isScheduledOrder && suggestedDuration !== null && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 border rounded-md bg-primary-foreground/10 dark:bg-primary-foreground/20">
                    <p>Vorgeschlagene Dauer für diesen Auftrag heute:</p>
                    <p className="font-semibold">{ suggestedDuration !== null && suggestedBreakMinutes !== null ? ((suggestedDuration - suggestedBreakMinutes) / 60).toFixed(2) : 'N/A'} Netto-Stunden</p>
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
                      disabled={loading || !!recurrenceInfo}
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