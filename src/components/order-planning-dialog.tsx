"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { processOrderRequest } from "@/app/dashboard/orders/actions";
import { Badge } from "./ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "./ui/input";

interface OrderPlanningDialogProps {
  order: {
    id: string;
    title: string;
    description: string | null;
    customer_name: string | null;
    object_name: string | null;
    service_type: string | null;
    total_estimated_hours: number | null;
    object_id: string | null;
    object: { recurrence_interval_weeks: number; start_week_offset: number; } | null;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export function OrderPlanningDialog({ order }: OrderPlanningDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [dailyHours, setDailyHours] = useState<{ [key: string]: number | null }>({
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  });
  const [dailyStartTimes, setDailyStartTimes] = useState<{ [key: string]: string | null }>({
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  });
  const [dailyEndTimes, setDailyEndTimes] = useState<{ [key: string]: string | null }>({
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  });
  const [recurrenceIntervalWeeks, setRecurrenceIntervalWeeks] = useState<number>(1);
  const [startWeekOffset, setStartWeekOffset] = useState<number>(0);

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const germanDayNames: { [key: string]: string } = {
    monday: 'Mo',
    tuesday: 'Di',
    wednesday: 'Mi',
    thursday: 'Do',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'So',
  };

  useEffect(() => {
    if (open) {
      const fetchEmployeesAndObjectHours = async () => {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .order('last_name', { ascending: true });
        if (employeesError) {
          toast.error("Mitarbeiter konnten nicht geladen werden.");
          console.error(employeesError);
        } else {
          setEmployees(employeesData);
        }

        // Fetch object's daily hours and times if object_id is available
        if (order.object_id) {
          const { data: objectData, error: objectError } = await supabase
            .from('objects')
            .select('monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours, monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time, wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time, friday_start_time, friday_end_time, saturday_start_time, saturday_end_time, sunday_start_time, sunday_end_time, recurrence_interval_weeks, start_week_offset')
            .eq('id', order.object_id)
            .single();

          if (objectError) {
            console.error("Fehler beim Laden der Objektstunden:", objectError);
            toast.error("Fehler beim Laden der Objektstunden.");
          } else if (objectData) {
            const newDailyHours: { [key: string]: number | null } = {};
            const newDailyStartTimes: { [key: string]: string | null } = {};
            const newDailyEndTimes: { [key: string]: string | null } = {};
            dayNames.forEach(day => {
              newDailyHours[day] = objectData[`${day}_hours` as keyof typeof objectData] || null;
              newDailyStartTimes[day] = objectData[`${day}_start_time` as keyof typeof objectData] || null;
              newDailyEndTimes[day] = objectData[`${day}_end_time` as keyof typeof objectData] || null;
            });
            setDailyHours(newDailyHours);
            setDailyStartTimes(newDailyStartTimes);
            setDailyEndTimes(newDailyEndTimes);
            setRecurrenceIntervalWeeks(objectData.recurrence_interval_weeks);
            setStartWeekOffset(objectData.start_week_offset);
          }
        } else {
          // Clear daily hours and times if no object is linked
          setDailyHours({
            monday: null, tuesday: null, wednesday: null, thursday: null,
            friday: null, saturday: null, sunday: null,
          });
          setDailyStartTimes({
            monday: null, tuesday: null, wednesday: null, thursday: null,
            friday: null, saturday: null, sunday: null,
          });
          setDailyEndTimes({
            monday: null, tuesday: null, wednesday: null, thursday: null,
            friday: null, saturday: null, sunday: null,
          });
          setRecurrenceIntervalWeeks(1);
          setStartWeekOffset(0);
        }
        setLoading(false);
      };
      fetchEmployeesAndObjectHours();
    }
  }, [open, order.object_id]);

  const handleDailyHourChange = (day: string, value: string) => {
    setDailyHours(prev => ({
      ...prev,
      [day]: value === '' ? null : Number(value),
    }));
  };

  const handleDailyStartTimeChange = (day: string, value: string) => {
    setDailyStartTimes(prev => ({
      ...prev,
      [day]: value === '' ? null : value,
    }));
  };

  const handleDailyEndTimeChange = (day: string, value: string) => {
    setDailyEndTimes(prev => ({
      ...prev,
      [day]: value === '' ? null : value,
    }));
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    // Append all daily hours and times to form data
    dayNames.forEach(day => {
      formData.append(`assigned_${day}_hours`, String(dailyHours[day] || ''));
      formData.append(`assigned_${day}_start_time`, String(dailyStartTimes[day] || ''));
      formData.append(`assigned_${day}_end_time`, String(dailyEndTimes[day] || ''));
    });
    formData.append('assigned_recurrence_interval_weeks', String(recurrenceIntervalWeeks));
    formData.append('assigned_start_week_offset', String(startWeekOffset));

    const result = await processOrderRequest(formData);
    if (result.success) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Planen & Genehmigen</Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "order-planning-open" : "order-planning-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Anfrage planen: {order.title}</DialogTitle>
          <DialogDescription>
            Wählen Sie einen Mitarbeiter aus, um diese Anfrage zu genehmigen oder lehnen Sie sie ab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <span className="font-semibold">Kunde:</span> {order.customer_name || 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Objekt:</span> {order.object_name || 'N/A'}
          </div>
          {order.service_type && (
            <div>
              <span className="font-semibold">Dienstleistung:</span> <Badge variant="outline">{order.service_type}</Badge>
            </div>
          )}
          <div>
            <span className="font-semibold">Beschreibung:</span>
            <p className="text-sm text-muted-foreground">{order.description || 'Keine Beschreibung.'}</p>
          </div>
          <form id="planning-form" action={handleSubmit}>
            <input type="hidden" name="orderId" value={order.id} />
            <div className="space-y-2">
              <Label htmlFor="employeeId">Mitarbeiter zuweisen</Label>
              <Select name="employeeId" onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                <SelectTrigger id="employeeId">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployeeId && (
              <div className="space-y-4 mt-4">
                <h3 className="text-lg font-semibold">Wiederholungsintervall für Mitarbeiter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assigned_recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
                    <Input
                      id="assigned_recurrence_interval_weeks"
                      name="assigned_recurrence_interval_weeks"
                      type="number"
                      step="1"
                      min="1"
                      max="52"
                      value={recurrenceIntervalWeeks}
                      onChange={(e) => setRecurrenceIntervalWeeks(Number(e.target.value))}
                      placeholder="Z.B. 1 für jede Woche, 2 für jede zweite Woche"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
                    <Input
                      id="assigned_start_week_offset"
                      name="assigned_start_week_offset"
                      type="number"
                      step="1"
                      min="0"
                      max={recurrenceIntervalWeeks - 1}
                      value={startWeekOffset}
                      onChange={(e) => setStartWeekOffset(Number(e.target.value))}
                      placeholder="Z.B. 0 für die erste Woche, 1 für die zweite Woche"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten für diesen Mitarbeiter gelten.
                  Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
                </p>
              </div>
            )}
            {selectedEmployeeId && order.object_id && (
              <div className="space-y-2 mt-4">
                <Label>Zugewiesene Stunden & Zeiten pro Wochentag</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                  {dayNames.map(day => (
                    <div key={day} className="p-2 border rounded-md">
                      <h4 className="font-medium text-sm mb-2">{germanDayNames[day]}</h4>
                      <div>
                          <Label htmlFor={`assigned_${day}_hours`} className="text-xs">Std.</Label>
                          <Input
                            id={`assigned_${day}_hours`}
                            name={`assigned_${day}_hours`}
                            type="number"
                            step="0.5"
                            placeholder="Std."
                            value={dailyHours[day] !== null ? dailyHours[day] : ''}
                            onChange={(e) => handleDailyHourChange(day, e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`assigned_${day}_start_time`} className="text-xs">Start</Label>
                          <Input
                            id={`assigned_${day}_start_time`}
                            name={`assigned_${day}_start_time`}
                            type="time"
                            value={dailyStartTimes[day] || ''}
                            onChange={(e) => handleDailyStartTimeChange(day, e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`assigned_${day}_end_time`} className="text-xs">Ende</Label>
                          <Input
                            id={`assigned_${day}_end_time`}
                            name={`assigned_${day}_end_time`}
                            type="time"
                            value={dailyEndTimes[day] || ''}
                            onChange={(e) => handleDailyEndTimeChange(day, e.target.value)}
                          />
                        </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Diese Stunden und Zeiten werden für den zugewiesenen Mitarbeiter übernommen.
                </p>
              </div>
            )}
            {!order.object_id && selectedEmployeeId && (
              <p className="text-sm text-muted-foreground mt-2">
                Kein Objekt für diesen Einsatz hinterlegt. Tägliche Stunden und Zeiten können nicht automatisch vorgeschlagen werden.
              </p>
            )}
          </form>
        </div>
        <DialogFooter>
          <Button form="planning-form" name="decision" value="rejected" variant="destructive" disabled={loading}>
            Ablehnen
          </Button>
          <Button form="planning-form" name="decision" value="approved" disabled={!selectedEmployeeId || loading}>
            {loading ? 'Wird bearbeitet...' : 'Genehmigen & Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}