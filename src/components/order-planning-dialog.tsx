"use client";

import React, { useState, useEffect } from "react"; // Import React
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
    object: { recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any; } | null; // Added daily_schedules
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface DailySchedule {
  day_of_week: string;
  week_offset_in_cycle: number;
  hours: number;
  start_time: string;
  end_time: string;
}

// Helper to parse daily schedules from JSONB
const parseDailySchedules = (jsonb: any): DailySchedule[] => {
  if (!jsonb) return [];
  return Array.isArray(jsonb) ? jsonb : [];
};

export function OrderPlanningDialog({ order }: OrderPlanningDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [assignedDailySchedules, setAssignedDailySchedules] = useState<DailySchedule[]>([]);
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

        // Fetch object's daily schedules if object_id is available
        if (order.object_id) {
          const { data: objectData, error: objectError } = await supabase
            .from('objects')
            .select('daily_schedules, recurrence_interval_weeks, start_week_offset')
            .eq('id', order.object_id)
            .single();

          if (objectError) {
            console.error("Fehler beim Laden der Objektstunden:", objectError);
            toast.error("Fehler beim Laden der Objektstunden.");
          } else if (objectData) {
            setAssignedDailySchedules(parseDailySchedules(objectData.daily_schedules));
            setRecurrenceIntervalWeeks(objectData.recurrence_interval_weeks);
            setStartWeekOffset(objectData.start_week_offset);
          }
        } else {
          // Clear daily schedules if no object is linked
          setAssignedDailySchedules([]);
          setRecurrenceIntervalWeeks(1);
          setStartWeekOffset(0);
        }
        setLoading(false);
      };
      fetchEmployeesAndObjectHours();
    }
  }, [open, order.object_id]);

  const handleScheduleChange = (day: string, weekOffset: number, field: 'hours' | 'start_time' | 'end_time', value: string) => {
    setAssignedDailySchedules(prevSchedules => {
      const newSchedules = [...prevSchedules];
      const index = newSchedules.findIndex(s => s.day_of_week === day && s.week_offset_in_cycle === weekOffset);

      if (index !== -1) {
        // Update existing schedule
        const updatedSchedule = { ...newSchedules[index] };
        if (field === 'hours') {
          updatedSchedule.hours = value === '' ? 0 : Number(value);
        } else {
          (updatedSchedule as any)[field] = value === '' ? null : value;
        }
        newSchedules[index] = updatedSchedule;
      } else {
        // Add new schedule if it doesn't exist
        newSchedules.push({
          day_of_week: day,
          week_offset_in_cycle: weekOffset,
          hours: field === 'hours' ? (value === '' ? 0 : Number(value)) : 0,
          start_time: field === 'start_time' ? (value === '' ? null : value) : null,
          end_time: field === 'end_time' ? (value === '' ? null : value) : null,
        } as DailySchedule);
      }
      return newSchedules;
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    
    formData.append('assigned_daily_schedules', JSON.stringify(assignedDailySchedules));
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

  const objectDailySchedules = parseDailySchedules(order.object?.daily_schedules || '[]');
  const objectRecurrenceIntervalWeeks = order.object?.recurrence_interval_weeks || 1;

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
                  {Array.from({ length: objectRecurrenceIntervalWeeks }).map((_, weekOffset) => (
                    <React.Fragment key={weekOffset}>
                      {objectRecurrenceIntervalWeeks > 1 && (
                        <div className="col-span-full text-sm font-semibold mt-2 mb-1">Woche {weekOffset + 1} im Zyklus</div>
                      )}
                      {dayNames.map(day => {
                        const objectSchedule = objectDailySchedules.find(s => s.day_of_week === day && s.week_offset_in_cycle === weekOffset);
                        if (!objectSchedule || objectSchedule.hours === 0) return null; // Only show days/slots defined in object

                        const assignedSchedule = assignedDailySchedules.find(s => s.day_of_week === day && s.week_offset_in_cycle === weekOffset);

                        return (
                          <div key={`${day}-${weekOffset}`} className="p-2 border rounded-md">
                            <h4 className="font-medium text-sm mb-2">{germanDayNames[day]}</h4>
                            <div>
                                <Label htmlFor={`hours-${day}-${weekOffset}`} className="text-xs">Std. (Objekt: {objectSchedule.hours})</Label>
                                <Input
                                  id={`hours-${day}-${weekOffset}`}
                                  type="number"
                                  step="0.5"
                                  placeholder="Std."
                                  value={assignedSchedule?.hours !== undefined ? assignedSchedule.hours : ''}
                                  onChange={(e) => handleScheduleChange(day, weekOffset, 'hours', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`start-${day}-${weekOffset}`} className="text-xs">Start</Label>
                                <Input
                                  id={`start-${day}-${weekOffset}`}
                                  type="time"
                                  value={assignedSchedule?.start_time || ''}
                                  onChange={(e) => handleScheduleChange(day, weekOffset, 'start_time', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`end-${day}-${weekOffset}`} className="text-xs">Ende</Label>
                                <Input
                                  id={`end-${day}-${weekOffset}`}
                                  type="time"
                                  value={assignedSchedule?.end_time || ''}
                                  onChange={(e) => handleScheduleChange(day, weekOffset, 'end_time', e.target.value)}
                                />
                              </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Diese Stunden und Zeiten werden für den zugewiesenen Mitarbeiter übernommen.
                </p>
              </div>
            )}
            {!order.object_id && selectedEmployeeId && (
              <p className="text-sm text-muted-foreground mt-2">
                Kein Objekt für diesen Auftrag hinterlegt. Tägliche Stunden und Zeiten können<dyad-problem-report summary="497 problems">
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="34" code="1003">Identifier expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="55" code="1005">',' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="280" column="1" code="2657">JSX expressions must have one parent element.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="280" column="84" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="282" column="85" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="284" column="83" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="104" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="218" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="285" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="487" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="13" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="127" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="163" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="365" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="15" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="129" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="183" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="385" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="104" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="218" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="285" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="487" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="13" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="127" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="163" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="365" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="15" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="129" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="183" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="385" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="303" column="134" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="303" column="392" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="304" column="134" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="304" column="392" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="305" column="133" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="305" column="391" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="130" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="347" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="349" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="359" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="312" column="17" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="312" column="142" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="312" column="206" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="312" column="265" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="60" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="185" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="237" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="296" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="107" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="316" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="318" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="323" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="69" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="278" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="280" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="285" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="316" column="146" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="316" column="271" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="317" column="146" code="1005">'}' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="317" column="271" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="1" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="9" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="19" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="28" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="32" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="39" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="43" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="49" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="66" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="74" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="81" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="90" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="95" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="99" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="103" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="112" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="124" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="160" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="167" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="171" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="175" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="186" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="216" code="1003">Identifier expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="1" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="6" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="10" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="40" code="1005">',' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="46" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="48" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="193" code="1005">',' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="352" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="353" code="1005">',' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="356" code="1005">')' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="365" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="366" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="8" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="42" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="52" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="98" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="130" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="207" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="227" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="301" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="319" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="359" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="42" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="61" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="130" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="147" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="180" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="8" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="50" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="58" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="99" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="47" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="67" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="117" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="192" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="198" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="257" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="47" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="54" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="97" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="53" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="58" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="95" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="39" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="58" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="66" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="118" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="203" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="218" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="234" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="47" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="58" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="134" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="177" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="48" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="77" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="135" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="196" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="13" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="14" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="18" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="19" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="20" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="35" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="36" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="39" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="41" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="42" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="43" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="53" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="54" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="57" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="59" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="60" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="61" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="85" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="86" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="89" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="94" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="95" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="96" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="105" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="106" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="109" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="114" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="115" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="116" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="130" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="131" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="134" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="136" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="137" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="138" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="141" code="1489">Decimals with leading zeros are not allowed.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="143" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="144" code="1121">Octal literals are not allowed. Use the syntax '0o0'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="147" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="148" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="151" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="153" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="154" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="155" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="167" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="168" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="171" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="173" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="174" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="175" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="180" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="181" code="1121">Octal literals are not allowed. Use the syntax '0o0'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="184" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="185" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="189" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="192" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="193" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="194" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="209" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="210" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="213" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="215" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="216" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="217" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="227" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="228" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="231" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="233" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="234" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="235" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="259" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="260" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="263" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="268" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="269" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="270" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="279" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="280" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="283" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="288" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="289" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="290" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="304" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="305" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="308" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="310" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="311" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="312" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="315" code="1489">Decimals with leading zeros are not allowed.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="317" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="318" code="1121">Octal literals are not allowed. Use the syntax '0o0'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="321" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="322" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="325" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="327" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="328" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="329" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="341" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="342" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="345" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="347" code="1109">Expression expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="348" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="349" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="354" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="355" code="1121">Octal literals are not allowed. Use the syntax '0o0'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="358" code="1127">Invalid character.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="359" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="363" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="791" column="41" code="1005">';' expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="791" column="60" code="1128">Declaration or statement expected.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="795" column="2" code="1160">Unterminated template literal.</problem>
<problem file="src/components/object-form.tsx" line="395" column="27" code="1005">'}' expected.</problem>
<problem file="src/components/object-form.tsx" line="395" column="120" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/object-form.tsx" line="395" column="137" code="1005">'}' expected.</problem>
<problem file="src/components/object-form.tsx" line="395" column="230" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/order-form.tsx" line="762" column="28" code="1109">Expression expected.</problem>
<problem file="src/components/order-form.tsx" line="762" column="29" code="1127">Invalid character.</problem>
<problem file="src/components/order-form.tsx" line="762" column="30" code="1005">'}' expected.</problem>
<problem file="src/components/order-form.tsx" line="762" column="198" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/app/dashboard/planning/actions.ts" line="7" column="10" code="2459">Module '&quot;@/components/order-form&quot;' declares 'dayNames' locally, but it is not exported.</problem>
<problem file="src/components/order-planning-dialog.tsx" line="256" column="22" code="2686">'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.</problem>
<problem file="src/components/order-planning-dialog.tsx" line="301" column="23" code="2686">'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="277" column="7" code="2322">Type 'void[] | undefined' is not assignable to type 'DisplayOrder[]'.
  Type 'undefined' is not assignable to type 'DisplayOrder[]'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="35" code="2304">Cannot find name 'dyad'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="40" code="2304">Cannot find name 'problem'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="48" code="2304">Cannot find name 'report'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="279" column="63" code="2365">Operator '&gt;' cannot be applied to types 'string' and 'Element'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="280" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="280" column="96" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="281" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="281" column="141" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="282" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="282" column="97" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="283" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="283" column="141" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="284" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="284" column="95" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="285" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="285" column="140" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="102" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="286" column="283" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="11" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="287" column="161" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="13" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="181" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="288" column="420" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="289" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="290" column="62" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="291" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="292" column="62" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="293" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="294" column="62" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="295" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="296" column="62" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="102" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="297" column="283" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="11" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="298" column="161" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="13" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="181" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="299" column="420" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="300" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="301" column="62" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="302" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="302" column="118" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="303" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="303" column="132" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="303" column="395" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="304" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="304" column="132" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="304" column="395" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="305" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="305" column="131" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="305" column="394" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="306" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="306" column="114" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="307" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="307" column="114" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="308" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="308" column="193" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="309" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="309" column="193" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="128" code="2304">Cannot find name 'id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="310" column="342" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="312" column="181" code="2304">Cannot find name 'recurrence_interval_weeks'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="212" code="2304">Cannot find name 'recurrence_interval_weeks'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="313" column="299" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="94" code="2304">Cannot find name 'customer_name'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="314" column="311" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="56" code="2304">Cannot find name 'customer_name'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="273" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="315" column="325" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="316" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="316" column="274" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="317" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="317" column="274" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="3" code="2304">Cannot find name 'dyad'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="3" code="2365">Operator '&gt;' cannot be applied to types 'number' and 'Element'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="8" code="2304">Cannot find name 'problem'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="16" code="2552">Cannot find name 'report'. Did you mean 'Report'?</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="318" column="23" code="2339">Property 'think' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="1" code="2339">Property 'think' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="9" code="2304">Cannot find name 'Okay'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="9" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="15" code="2304">Cannot find name 'ich'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="19" code="2304">Cannot find name 'verstehe'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="28" code="2304">Cannot find name 'die'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="32" code="2304">Cannot find name 'Fehler'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="39" code="2304">Cannot find name 'und'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="43" code="2304">Cannot find name 'werde'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="49" code="2304">Cannot find name 'sie'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="53" code="2304">Cannot find name 'beheben'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="66" code="2304">Cannot find name 'meisten'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="74" code="2304">Cannot find name 'Fehler'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="81" code="2304">Cannot find name 'beziehen'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="90" code="2304">Cannot find name 'sich'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="95" code="2304">Cannot find name 'auf'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="99" code="2304">Cannot find name 'die'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="103" code="2304">Cannot find name 'korrekte'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="112" code="2304">Cannot find name 'Typisierung'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="124" code="2304">Cannot find name 'der'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="128" code="2304">Cannot find name 'neuen'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="153" code="2304">Cannot find name 'JSONB'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="160" code="2304">Cannot find name 'Felder'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="167" code="2304">Cannot find name 'und'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="171" code="2304">Cannot find name 'die'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="175" code="2304">Cannot find name 'Verwendung'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="186" code="2304">Cannot find name 'von'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="190" code="2304">Cannot find name 'Template'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="199" code="2304">Cannot find name 'Literalen'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="353" column="212" code="2304">Cannot find name 'JSX'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="1" code="2304">Cannot find name 'Hier'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="6" code="2304">Cannot find name 'ist'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="355" column="10" code="2304">Cannot find name 'der'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="7" code="2304">Cannot find name 'Template'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="16" code="2304">Cannot find name 'Literale'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="28" code="2304">Cannot find name 'JSX'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="28" code="2322">Type 'number' is not assignable to type 'object'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="33" code="2304">Cannot find name 'Fehler'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="48" code="2304">Cannot find name 'Die'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="52" code="2304">Cannot find name 'Backticks'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="63" code="2349">This expression is not callable.
  Type 'String' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="193" code="2349">This expression is not callable.
  Type '{}' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="357" column="357" code="2362">The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="12" code="2304">Cannot find name 'components'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="23" code="2304">Cannot find name 'order'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="29" code="2304">Cannot find name 'form'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="42" code="2304">Cannot find name 'setObjects'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="91" code="2304">Cannot find name 'objects'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="121" code="2304">Cannot find name 'OrderForm'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="159" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="168" code="2349">This expression is not callable.
  Type 'null' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="224" code="2693">'any' only refers to a type, but is being used as a value here.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="283" code="2304">Cannot find name 'total_weekly_hours'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="308" code="2304">Cannot find name 'time_of_day'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="358" column="352" code="2304">Cannot find name 'objects'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="12" code="2304">Cannot find name 'components'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="23" code="2304">Cannot find name 'order'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="29" code="2304">Cannot find name 'form'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="102" code="2304">Cannot find name 'emp'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="138" code="2349">This expression is not callable.
  Type 'undefined' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="192" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="192" code="2869">Right operand of ?? is unreachable because the left operand is never nullish.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="201" code="2349">This expression is not callable.
  Type 'null' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="359" column="254" code="2349">This expression is not callable.
  Type 'String' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="12" code="2304">Cannot find name 'app'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="16" code="2304">Cannot find name 'dashboard'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="26" code="2304">Cannot find name 'planning'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="35" code="2304">Cannot find name 'actions'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="50" code="2304">Cannot find name 'dayNames'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="360" column="91" code="2304">Cannot find name 'dayNames'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="12" code="2304">Cannot find name 'components'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="23" code="2304">Cannot find name 'time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="28" code="2304">Cannot find name 'entry'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="34" code="2304">Cannot find name 'form'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="47" code="2304">Cannot find name 'selectedOrder'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="101" code="2304">Cannot find name 'OrderWithDetails'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="137" code="2304">Cannot find name 'time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="142" code="2304">Cannot find name 'entry'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="148" code="2304">Cannot find name 'form'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="192" code="2304">Cannot find name 'object'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="361" column="242" code="2304">Cannot find name 'daily_schedules'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="12" code="2304">Cannot find name 'components'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="23" code="2304">Cannot find name 'time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="28" code="2304">Cannot find name 'entry'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="34" code="2304">Cannot find name 'form'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="54" code="2345">Argument of type 'TemplateStringsArray' is not assignable to parameter of type 'string | number | Date'.
  Type 'TemplateStringsArray' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 37 more.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="362" column="97" code="2345">Argument of type 'TemplateStringsArray' is not assignable to parameter of type 'string | number | Date'.
  Type 'TemplateStringsArray' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 37 more.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="12" code="2304">Cannot find name 'components'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="23" code="2304">Cannot find name 'order'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="29" code="2304">Cannot find name 'planning'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="38" code="2304">Cannot find name 'dialog'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="53" code="2349">This expression is not callable.
  Type 'typeof import(&quot;C:/Users/murat/dyad-apps/aris-dashboard/node_modules/.pnpm/@types+react@19.1.5/node_modules/@types/react/index.d.ts&quot;)' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="53" code="2686">'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="90" code="2349">This expression is not callable.
  Type 'typeof import(&quot;C:/Users/murat/dyad-apps/aris-dashboard/node_modules/.pnpm/@types+react@19.1.5/node_modules/@types/react/index.d.ts&quot;)' has no call signatures.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="363" column="90" code="2686">'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="12" code="2304">Cannot find name 'app'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="16" code="2304">Cannot find name 'dashboard'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="26" code="2304">Cannot find name 'page'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="58" code="2345">Argument of type 'TemplateStringsArray' is not assignable to parameter of type 'OrderPlanningDialogProps'.
  Property 'order' is missing in type 'TemplateStringsArray' but required in type 'OrderPlanningDialogProps'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="61" code="2304">Cannot find name 'order'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="106" code="2693">'DisplayOrder' only refers to a type, but is being used as a value here.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="138" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="142" code="2304">Cannot find name 'app'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="146" code="2304">Cannot find name 'dashboard'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="156" code="2304">Cannot find name 'orders'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="163" code="2304">Cannot find name 'page'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="203" code="2304">Cannot find name 'daily_schedules'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="364" column="228" code="2304">Cannot find name 'object'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="12" code="2304">Cannot find name 'app'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="16" code="2304">Cannot find name 'dashboard'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="26" code="2304">Cannot find name 'objects'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="34" code="2304">Cannot find name 'page'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="47" code="2304">Cannot find name 'objectsData'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="115" code="2304">Cannot find name 'customer_contact_id'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="365" column="164" code="2304">Cannot find name 'DisplayObject'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="8" code="2304">Cannot find name 'src'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="12" code="2304">Cannot find name 'app'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="16" code="2304">Cannot find name 'employee'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="25" code="2304">Cannot find name 'dashboard'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="35" code="2304">Cannot find name 'page'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="48" code="2304">Cannot find name 'order'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="111" code="2304">Cannot find name 'RawEmployeeOrderResponse'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="181" code="2304">Cannot find name 'daily_schedules'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="366" column="206" code="2304">Cannot find name 'objects'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="23" code="2304">Cannot find name 'day_of_week'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="46" code="2304">Cannot find name 'monday'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="64" code="2304">Cannot find name 'week_offset_in_cycle'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="91" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="99" code="2304">Cannot find name 'hours'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="111" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="119" code="2304">Cannot find name 'start_time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="158" code="2304">Cannot find name 'end_time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="197" code="2304">Cannot find name 'day_of_week'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="220" code="2304">Cannot find name 'monday'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="238" code="2304">Cannot find name 'week_offset_in_cycle'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="265" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="273" code="2304">Cannot find name 'hours'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="285" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="293" code="2304">Cannot find name 'start_time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="778" column="332" code="2304">Cannot find name 'end_time'.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="791" column="41" code="2581">Cannot find name '$'. Do you need to install type definitions for jQuery? Try `npm i --save-dev @types/jquery`.</problem>
<problem file="src/app/dashboard/orders/page.tsx" line="791" column="43" code="2304">Cannot find name 'submitButtonText'.</problem>
<problem file="src/app/dashboard/objects/page.tsx" line="203" column="7" code="2322">Type '{ customer_name: any; object_leader_first_name: any; object_leader_last_name: any; daily_schedules: DailySchedule[]; id: any; user_id: any; customer_id: any; name: any; address: any; ... 13 more ...; customer_contacts: { ...; }[]; }[]' is not assignable to type 'DisplayObject[]'.
  Property 'customer_contact_id' is missing in type '{ customer_name: any; object_leader_first_name: any; object_leader_last_name: any; daily_schedules: DailySchedule[]; id: any; user_id: any; customer_id: any; name: any; address: any; ... 13 more ...; customer_contacts: { ...; }[]; }' but required in type 'DisplayObject'.</problem>
</dyad-problem-report>Okay, das ist eine ganze Reihe von Fehlern, die sich hauptsächlich um die korrekte Handhabung der neuen `daily_schedules` (JSONB) Felder und die damit verbundenen Typisierungen drehen, sowie um einige JSX-Syntaxfehler in Template-Literalen.

Ich werde diese Fehler in den betroffenen Dateien beheben.

Hier ist der Plan:

1.  **JSX Template Literal Syntax (Fehler 1-6, 142-260)**: Die geschweiften Klammern `{}` innerhalb von Backticks (`` ` ``) in JSX-Textknoten müssen maskiert werden, damit sie nicht als JSX-Ausdrücke interpretiert werden. Ich werde `&#123;` für `{` und `&#125;` für `}` verwenden.
2.  **`src/app/dashboard/orders/page.tsx` - `ordersData` Mapping (Fehler 7-18, 264-346)**: Der `select`-Query für `orders` muss die `daily_schedules`, `recurrence_interval_weeks` und `start_week_offset` aus den `objects` und `order_employee_assignments` explizit abrufen, damit sie im `map`-Schritt korrekt zugewiesen werden können. Außerdem muss die `DisplayOrder`-Schnittstelle in `src/app/dashboard/orders/page.tsx` aktualisiert werden, um die `daily_schedules` in der `object`-Eigenschaft zu enthalten.
3.  **`src/components/order-form.tsx` - `objects` State Typisierung (Fehler 7, 12)**: Die `objects`-State-Definition in `OrderForm` muss aktualisiert werden, um `daily_schedules: any` (da es ein geparstes JSONB-Objekt ist) und die neuen Wiederholungsfelder zu reflektieren.
4.  **`src/components/order-form.tsx` - `parseDailySchedules` Argument-Typ (Fehler 8, 9, 11, 13, 478)**: Die Aufrufe von `parseDailySchedules` müssen sicherstellen, dass der übergebene Wert `string | null` ist, indem ein Null-Coalescing-Operator (`?? '[]'`) verwendet wird.
5.  **`src/app/dashboard/planning/actions.ts` - `dayNames` Import (Fehler 14, 261)**: `dayNames` muss aus `src/components/order-form` importiert werden.
6.  **`src/components/time-entry-form.tsx` - `selectedOrder.object` Property (Fehler 15-17)**: Die `OrderWithDetails`-Schnittstelle in `time-entry-form.tsx` muss aktualisiert werden, um die `object`-Eigenschaft korrekt zu typisieren, damit `daily_schedules` darauf zugreifbar ist.
7.  **`src/components/time-entry-form.tsx` - `getWeek` Import (Fehler 18-19)**: `getWeek` muss aus `date-fns` importiert werden.
8.  **`src/components/order-planning-dialog.tsx` - `React` Import (Fehler 20-21, 262-263)**: `React` muss explizit importiert werden.
9.  **`src/app/dashboard/objects/page.tsx` - `objectsData` Mapping (Fehler 23, 497)**: Der `select`-Query für `objects` muss `customer_contact_id` explizit abrufen, damit es im `map`-Schritt korrekt zugewiesen werden kann.
10. **`src/app/employee/dashboard/page.tsx` - `order.object?.daily_schedules` Property (Fehler 24-25)**: Die `RawEmployeeOrderResponse`-Schnittstelle muss aktualisiert werden, um `daily_schedules` in der `objects`-Eigenschaft zu enthalten.
11. **Restliche Fehler (250-252, 347-477)**: Diese Fehler sind Folgefehler der oben genannten Probleme, insbesondere der JSX-Syntaxfehler und der Typ-Mismatches. Sie sollten nach Behebung der Hauptursachen verschwinden.

Hier sind die Korrekturen:

<dyad-write path="src/components/object-form.tsx" description="Behebt Template-Literal-Fehler in JSX und aktualisiert die Objektabfrage.">
"use client";

import { useForm, SubmitHandler, FieldPath, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, X, Clock, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createObject } from "@/app/dashboard/objects/actions";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { MultiSelectEmployees } from "@/components/multi-select-employees";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

const preprocessNumber = (val: unknown) => (val === "" || isNaN(Number(val)) ? null : Number(val));
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const germanDayNames: { [key: string]: string } = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_daily_schedules: z.string().optional().nullable(), // New JSONB field
  assigned_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  assigned_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
});

export type AssignedEmployee = z.infer<typeof assignedEmployeeSchema>;

export const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name ist zu lang"),
  address: z.string().min(1, "Adresse ist erforderlich").max(255, "Adresse ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  timeOfDay: z.enum(["any", "morning", "noon", "afternoon"]).default("any"),
  accessMethod: z.enum(["key", "card", "code", "other"]).default("key"),
  pin: z.string().max(50, "PIN ist zu lang").optional().nullable(),
  isAlarmSecured: z.boolean().default(false),
  alarmPassword: z.string().max(50, "Alarmkennwort ist zu lang").optional().nullable(),
  securityCodeWord: z.string().max(50, "Sicherheitscodewort ist zu lang").optional().nullable(),
  daily_schedules: z.string().optional().nullable(), // New JSONB field
  recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
}).superRefine((data, ctx) => {
  if (data.isAlarmSecured && !data.alarmPassword && !data.securityCodeWord) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Alarmkennwort oder Sicherheitscodewort ist erforderlich, wenn alarmgesichert.",
      path: ["alarmPassword"],
    });
  }
  // Basic JSON validation for daily_schedules
  if (data.daily_schedules) {
    try {
      JSON.parse(data.daily_schedules);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ungültiges JSON-Format für tägliche Zeitpläne.",
        path: ["daily_schedules"],
      });
    }
  }
});

export type ObjectFormInput = z.input<typeof objectSchema>;
export type ObjectFormValues = z.infer<typeof objectSchema>;

interface ObjectFormProps {
  initialData?: Partial<ObjectFormInput>;
  onSubmit: (data: ObjectFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function ObjectForm({ initialData, onSubmit, submitButtonText, onSuccess }: ObjectFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [isNewObjectDialogOpen, setIsNewObjectDialogOpen] = useState(false);

  const resolvedDefaultValues: ObjectFormValues = {
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? null,
    customerId: initialData?.customerId ?? "",
    customerContactId: initialData?.customerContactId ?? null,
    notes: initialData?.notes ?? null,
    priority: initialData?.priority ?? "medium",
    timeOfDay: initialData?.timeOfDay ?? "any",
    accessMethod: initialData?.accessMethod ?? "key",
    pin: initialData?.pin ?? null,
    isAlarmSecured: initialData?.isAlarmSecured ?? false,
    alarmPassword: initialData?.alarmPassword ?? null,
    securityCodeWord: initialData?.securityCodeWord ?? null,
    daily_schedules: initialData?.daily_schedules ?? '[]', // Default to empty JSON array string
    recurrence_interval_weeks: (initialData?.recurrence_interval_weeks as number | undefined) ?? 1,
    start_week_offset: (initialData?.start_week_offset as number | undefined) ?? 0,
  };

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema as z.ZodSchema<ObjectFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange",
  });

  const selectedCustomerId = form.watch("customerId");
  
  const fetchCustomerContacts = async (customerId: string) => {
    const { data: contactsData, error: contactsError } = await supabase
      .from('customer_contacts')
      .select('id, first_name, last_name, customer_id')
      .eq('customer_id', customerId)
      .order('last_name', { ascending: true });
    if (contactsData) setCustomerContacts(contactsData);
    if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name');
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);
    };
    fetchDropdownData();
  }, [supabase]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  const handleFormSubmit: SubmitHandler<ObjectFormValues> = async (data) => {
    const result = await onSubmit(data);
    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    }
  };

  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId);
      form.setValue("customerContactId", newContactId);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full">
      <div>
        <Label htmlFor="name">Objektname</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Z.B. Hauptgebäude"
        />
        {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Z.B. Musterstraße 1, 12345 Musterstadt"
          rows={3}
        />
        {form.formState.errors.address && <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Zusätzliche Details zum Objekt..."
          rows={3}
        />
        {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>}
      </div>
      <div>
        <Label htmlFor="customerId">Zugehöriger Kunde</Label>
        <Select onValueChange={(value) => {
          form.setValue("customerId", value);
          form.setValue("customerContactId", null); // Reset contact when customer changes
        }} value={form.watch("customerId")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="customerContactId">Objektleiter (Kundenkontakt, optional)</Label>
          <Select onValueChange={(value) => form.setValue("customerContactId", value === "unassigned" ? null : value)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kundenkontakt auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Objektleiter zugewiesen</SelectItem>
              {customerContacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.customerContactId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>}
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>
      <div>
        <Label htmlFor="notes">Interne Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Interne Notizen zum Objekt (z.B. Besonderheiten, Gefahren)..."
          rows={3}
        />
        {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="priority">Priorität</Label>
          <Select onValueChange={(value) => form.setValue("priority", value as ObjectFormValues["priority"])} value={form.watch("priority")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priorität auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Niedrig</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.priority && <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>}
        </div>
        <div>
          <Label htmlFor="timeOfDay">Bevorzugte Tageszeit</Label>
          <Select onValueChange={(value) => form.setValue("timeOfDay", value as ObjectFormValues["timeOfDay"])} value={form.watch("timeOfDay")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tageszeit auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Beliebig</SelectItem>
              <SelectItem value="morning">Vormittags</SelectItem>
              <SelectItem value="noon">Mittags</SelectItem>
              <SelectItem value="afternoon">Nachmittags</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.timeOfDay && <p className="text-red-500 text-sm mt-1">{form.formState.errors.timeOfDay.message}</p>}
        </div>
        <div>
          <Label htmlFor="accessMethod">Zugangsmethode</Label>
          <Select onValueChange={(value) => form.setValue("accessMethod", value as ObjectFormValues["accessMethod"])} value={form.watch("accessMethod")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Methode auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key">Schlüssel</SelectItem>
              <SelectItem value="card">Zutrittskarte</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="other">Andere</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.accessMethod && <p className="text-red-500 text-sm mt-1">{form.formState.errors.accessMethod.message}</p>}
        </div>
      </div>
      {form.watch("accessMethod") === "code" && (
        <div>
          <Label htmlFor="pin">PIN / Zugangscode</Label>
          <Input
            id="pin"
            {...form.register("pin")}
            placeholder="Z.B. 1234"
          />
          {form.formState.errors.pin && <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>}
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Controller
          control={form.control}
          name="isAlarmSecured"
          render={({ field }) => (
            <Checkbox
              id="isAlarmSecured"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isAlarmSecured">Objekt ist alarmgesichert</Label>
      </div>
      {form.watch("isAlarmSecured") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="alarmPassword">Alarmkennwort (optional)</Label>
            <Input
              id="alarmPassword"
              {...form.register("alarmPassword")}
              placeholder="Z.B. 5678"
            />
            {form.formState.errors.alarmPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.alarmPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="securityCodeWord">Sicherheitscodewort (optional)</Label>
            <Input
              id="securityCodeWord"
              {...form.register("securityCodeWord")}
              placeholder="Z.B. 'Sonne'"
            />
            {form.formState.errors.securityCodeWord && <p className="text-red-500 text-sm mt-1">{form.formState.errors.securityCodeWord.message}</p>}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Wiederholungsintervall</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
            <Input
              id="recurrence_interval_weeks"
              type="number"
              step="1"
              min="1"
              max="52"
              {...form.register("recurrence_interval_weeks", { valueAsNumber: true })}
              placeholder="Z.B. 1 für jede Woche, 2 für jede zweite Woche"
            />
            {form.formState.errors.recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{form.formState.errors.recurrence_interval_weeks.message}</p>}
          </div>
          <div>
            <Label htmlFor="start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
            <Input
              id="start_week_offset"
              type="number"
              step="1"
              min="0"
              max={form.watch("recurrence_interval_weeks") - 1}
              {...form.register("start_week_offset", { valueAsNumber: true })}
              placeholder="Z.B. 0 für die erste Woche, 1 für die zweite Woche"
            />
            {form.formState.errors.start_week_offset && <p className="text-red-500 text-sm mt-1">{form.formState.errors.start_week_offset.message}</p>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten gelten.
          Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Regelmäßige Arbeitszeiten pro Wochentag (JSON)</h3>
        <p className="text-sm text-muted-foreground">
          Geben Sie die Zeitpläne als JSON-Array ein. Beispiel:
          `&#91;{&#34;day_of_week&#34;: &#34;monday&#34;, &#34;week_offset_in_cycle&#34;: 0, &#34;hours&#34;: 8, &#34;start_time&#34;: &#34;08:00&#34;, &#34;end_time&#34;: &#34;16:00&#34;}, {&#34;day_of_week&#34;: &#34;monday&#34;, &#34;week_offset_in_cycle&#34;: 1, &#34;hours&#34;: 6, &#34;start_time&#34;: &#34;09:00&#34;, &#34;end_time&#34;: &#34;15:00&#34;}]`
        </p>
        <Textarea
          id="daily_schedules"
          {...form.register("daily_schedules")}
          placeholder="[{'day_of_week': 'monday', 'week_offset_in_cycle': 0, 'hours': 8, 'start_time': '08:00', 'end_time': '16:00'}]"
          rows={10}
          className="font-mono text-xs"
        />
        {form.formState.errors.daily_schedules && <p className="text-red-500 text-sm mt-1">{form.formState.errors.daily_schedules.message}</p>}
      </div>
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}