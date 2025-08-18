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

        // Fetch object's daily hours if object_id is available
        if (order.object_id) {
          const { data: objectData, error: objectError } = await supabase
            .from('objects')
            .select('monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours')
            .eq('id', order.object_id)
            .single();

          if (objectError) {
            console.error("Fehler beim Laden der Objektstunden:", objectError);
            toast.error("Fehler beim Laden der Objektstunden.");
          } else if (objectData) {
            const newDailyHours: { [key: string]: number | null } = {};
            dayNames.forEach(day => {
              newDailyHours[day] = objectData[`${day}_hours` as keyof typeof objectData] || null;
            });
            setDailyHours(newDailyHours);
          }
        } else {
          // Clear daily hours if no object is linked
          setDailyHours({
            monday: null, tuesday: null, wednesday: null, thursday: null,
            friday: null, saturday: null, sunday: null,
          });
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

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    // Append all daily hours to form data
    dayNames.forEach(day => {
      formData.append(`assigned_${day}_hours`, String(dailyHours[day] || ''));
    });

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
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
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
            {selectedEmployeeId && order.object_id && (
              <div className="space-y-2 mt-4">
                <Label>Zugewiesene Stunden pro Wochentag</Label>
                <div className="grid grid-cols-2 gap-2">
                  {dayNames.map(day => (
                    <div key={day}>
                      <Label htmlFor={`assigned_${day}_hours`} className="text-xs">{germanDayNames[day]} Std.</Label>
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
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Diese Stunden werden für den zugewiesenen Mitarbeiter übernommen.
                </p>
              </div>
            )}
            {!order.object_id && selectedEmployeeId && (
              <p className="text-sm text-muted-foreground mt-2">
                Kein Objekt für diesen Auftrag hinterlegt. Tägliche Stunden können nicht automatisch vorgeschlagen werden.
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