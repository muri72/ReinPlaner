import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateEndTime } from '@/lib/utils'; // Import calculateEndTime

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
}

interface ObjectWorkingHours {
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
}

interface EmployeeAssignment {
  employee_id: string;
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

interface OrderEmployeeAssignmentsProps {
  orderId?: string;
  objectId?: string;
  onAssignmentsChange?: (assignments: EmployeeAssignment[]) => void;
  initialAssignments?: EmployeeAssignment[];
}

const WEEKDAYS = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' }
];

export default function OrderEmployeeAssignments({ 
  orderId, 
  objectId, 
  onAssignmentsChange,
  initialAssignments = []
}: OrderEmployeeAssignmentsProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>(initialAssignments);
  const [objectHours, setObjectHours] = useState<ObjectWorkingHours | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch available employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch object working hours when objectId changes
  useEffect(() => {
    if (objectId) {
      fetchObjectWorkingHours();
    }
  }, [objectId]);

  // Load existing assignments if orderId is provided
  useEffect(() => {
    if (orderId && initialAssignments.length === 0) {
      fetchExistingAssignments();
    } else {
      setLoading(false);
    }
  }, [orderId, initialAssignments]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id')
        .eq('status', 'active')
        .order('last_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    }
  };

  const fetchObjectWorkingHours = async () => {
    if (!objectId) return;

    try {
      const { data, error } = await supabase
        .from('objects')
        .select(`
          monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
          friday_hours, saturday_hours, sunday_hours,
          monday_start_time, tuesday_start_time, wednesday_start_time, thursday_start_time,
          friday_start_time, saturday_start_time, sunday_start_time,
          monday_end_time, tuesday_end_time, wednesday_end_time, thursday_end_time,
          friday_end_time, saturday_end_time, sunday_end_time
        `)
        .eq('id', objectId)
        .single();

      if (error) throw error;
      setObjectHours(data);
    } catch (error) {
      console.error('Error fetching object working hours:', error);
      toast.error('Fehler beim Laden der Objektarbeitszeiten');
    }
  };

  const fetchExistingAssignments = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('order_employee_assignments')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      
      const formattedAssignments = data?.map(assignment => ({
        employee_id: assignment.employee_id,
        assigned_monday_hours: assignment.assigned_monday_hours,
        assigned_tuesday_hours: assignment.assigned_tuesday_hours,
        assigned_wednesday_hours: assignment.assigned_wednesday_hours,
        assigned_thursday_hours: assignment.assigned_thursday_hours,
        assigned_friday_hours: assignment.assigned_friday_hours,
        assigned_saturday_hours: assignment.assigned_saturday_hours,
        assigned_sunday_hours: assignment.assigned_sunday_hours,
        assigned_monday_start_time: assignment.assigned_monday_start_time,
        assigned_tuesday_start_time: assignment.assigned_tuesday_start_time,
        assigned_wednesday_start_time: assignment.assigned_wednesday_start_time,
        assigned_thursday_start_time: assignment.assigned_thursday_start_time,
        assigned_friday_start_time: assignment.assigned_friday_start_time,
        assigned_saturday_start_time: assignment.assigned_saturday_start_time,
        assigned_sunday_start_time: assignment.assigned_sunday_start_time,
        assigned_monday_end_time: assignment.assigned_monday_end_time,
        assigned_tuesday_end_time: assignment.assigned_tuesday_end_time,
        assigned_wednesday_end_time: assignment.assigned_wednesday_end_time,
        assigned_thursday_end_time: assignment.assigned_thursday_end_time,
        assigned_friday_end_time: assignment.assigned_friday_end_time,
        assigned_saturday_end_time: assignment.assigned_saturday_end_time,
        assigned_sunday_end_time: assignment.assigned_sunday_end_time,
      })) || [];

      setAssignments(formattedAssignments);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching existing assignments:', error);
      setLoading(false);
    }
  };

  const distributeObjectHours = (employeeIds: string[]): EmployeeAssignment[] => {
    if (!objectHours || employeeIds.length === 0) return [];

    return employeeIds.map(employeeId => {
      const assignment: EmployeeAssignment = {
        employee_id: employeeId,
        assigned_monday_hours: null,
        assigned_tuesday_hours: null,
        assigned_wednesday_hours: null,
        assigned_thursday_hours: null,
        assigned_friday_hours: null,
        assigned_saturday_hours: null,
        assigned_sunday_hours: null,
        assigned_monday_start_time: null,
        assigned_tuesday_start_time: null,
        assigned_wednesday_start_time: null,
        assigned_thursday_start_time: null,
        assigned_friday_start_time: null,
        assigned_saturday_start_time: null,
        assigned_sunday_start_time: null,
        assigned_monday_end_time: null,
        assigned_tuesday_end_time: null,
        assigned_wednesday_end_time: null,
        assigned_thursday_end_time: null,
        assigned_friday_end_time: null,
        assigned_saturday_end_time: null,
        assigned_sunday_end_time: null,
      };

      // Distribute hours for each day
      WEEKDAYS.forEach(({ key }) => {
        const objectDayHours = objectHours[`${key}_hours` as keyof ObjectWorkingHours] as number | null;
        const objectStartTime = objectHours[`${key}_start_time` as keyof ObjectWorkingHours] as string | null;
        const objectEndTime = objectHours[`${key}_end_time` as keyof ObjectWorkingHours] as string | null;

        if (objectDayHours && objectDayHours > 0) {
          // If only one employee, give them all hours
          // If multiple employees, distribute equally
          const hoursPerEmployee = employeeIds.length === 1 ? objectDayHours : objectDayHours / employeeIds.length;
          
          (assignment as any)[`assigned_${key}_hours`] = hoursPerEmployee;
          (assignment as any)[`assigned_${key}_start_time`] = objectStartTime;
          (assignment as any)[`assigned_${key}_end_time`] = objectEndTime; // Copy end time directly
        }
      });

      return assignment;
    });
  };

  const addEmployee = () => {
    const newAssignment: EmployeeAssignment = {
      employee_id: '',
      assigned_monday_hours: null,
      assigned_tuesday_hours: null,
      assigned_wednesday_hours: null,
      assigned_thursday_hours: null,
      assigned_friday_hours: null,
      assigned_saturday_hours: null,
      assigned_sunday_hours: null,
      assigned_monday_start_time: null,
      assigned_tuesday_start_time: null,
      assigned_wednesday_start_time: null,
      assigned_thursday_start_time: null,
      assigned_friday_start_time: null,
      assigned_saturday_start_time: null,
      assigned_sunday_start_time: null,
      assigned_monday_end_time: null,
      assigned_tuesday_end_time: null,
      assigned_wednesday_end_time: null,
      assigned_thursday_end_time: null,
      assigned_friday_end_time: null,
      assigned_saturday_end_time: null,
      assigned_sunday_end_time: null,
    };

    const newAssignments = [...assignments, newAssignment];
    setAssignments(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  const removeEmployee = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    
    // Redistribute hours among remaining employees
    if (newAssignments.length > 0 && objectHours) {
      const employeeIds = newAssignments
        .filter(a => a.employee_id)
        .map(a => a.employee_id);
      
      if (employeeIds.length > 0) {
        const redistributed = distributeObjectHours(employeeIds);
        redistributed.forEach((redist, idx) => {
          const assignmentIndex = newAssignments.findIndex(a => a.employee_id === redist.employee_id);
          if (assignmentIndex !== -1) {
            Object.assign(newAssignments[assignmentIndex], redist);
          }
        });
      }
    }
    
    setAssignments(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  const updateEmployeeSelection = (index: number, employeeId: string) => {
    const newAssignments = [...assignments];
    newAssignments[index].employee_id = employeeId;

    // If this is a new employee selection and we have object hours, inherit them
    if (employeeId && objectHours) {
      const currentEmployeeIds = newAssignments
        .filter(a => a.employee_id)
        .map(a => a.employee_id);
      
      // Redistribute hours among all selected employees
      const redistributedAssignments = distributeObjectHours(currentEmployeeIds);
      
      // Update assignments with redistributed hours
      newAssignments.forEach((assignment, idx) => {
        if (assignment.employee_id) {
          const redistributed = redistributedAssignments.find(r => r.employee_id === assignment.employee_id);
          if (redistributed) {
            Object.assign(newAssignments[idx], redistributed);
          }
        }
      });
    }

    setAssignments(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  const updateEmployeeHours = (index: number, day: string, hours: number | null) => {
    const newAssignments = [...assignments];
    const assignment = newAssignments[index];
    
    // Validate that individual assigned hours do not exceed object hours
    if (objectHours && hours) {
      const objectDayHours = objectHours[`${day}_hours` as keyof ObjectWorkingHours] as number | null;
      // Allow assigned hours to be less than or equal to object hours
      if (objectDayHours !== null && hours > objectDayHours + 0.1) { // Allow slight tolerance
        toast.error(`Die Stunden für ${WEEKDAYS.find(w => w.key === day)?.label} dürfen ${objectDayHours} Stunden nicht überschreiten`);
        return;
      }
    }
    
    // Update hours
    (assignment as any)[`assigned_${day}_hours`] = hours;
    
    // Recalculate end time if we have start time and hours
    const startTime = (assignment as any)[`assigned_${day}_start_time`] as string | null;
    if (startTime && hours) {
      (assignment as any)[`assigned_${day}_end_time`] = calculateEndTime(startTime, hours);
    } else {
      (assignment as any)[`assigned_${day}_end_time`] = null;
    }

    setAssignments(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  const updateEmployeeStartTime = (index: number, day: string, startTime: string) => {
    const newAssignments = [...assignments];
    const assignment = newAssignments[index];
    
    // Update start time
    (assignment as any)[`assigned_${day}_start_time`] = startTime;
    
    // Recalculate end time if we have hours
    const hours = (assignment as any)[`assigned_${day}_hours`] as number | null;
    if (startTime && hours) {
      (assignment as any)[`assigned_${day}_end_time`] = calculateEndTime(startTime, hours);
    } else {
      (assignment as any)[`assigned_${day}_end_time`] = null;
    }

    setAssignments(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  const getTotalHoursForDay = (day: string): number => {
    return assignments.reduce((sum, assignment) => {
      const hours = (assignment as any)[`assigned_${day}_hours`] as number | null;
      return sum + (hours || 0);
    }, 0);
  };

  const getObjectHoursForDay = (day: string): number | null => {
    if (!objectHours) return null;
    return objectHours[`${day}_hours` as keyof ObjectWorkingHours] as number | null;
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : '';
  };

  if (loading) {
    return <div className="p-4">Lade Mitarbeiterzuweisungen...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Mitarbeiterzuweisungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {assignments.map((assignment, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Mitarbeiter auswählen</Label>
                <Select
                  value={assignment.employee_id}
                  onValueChange={(value) => updateEmployeeSelection(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(emp => 
                        !assignments.some((a, i) => i !== index && a.employee_id === emp.id)
                      )
                      .map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEmployee(index)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {assignment.employee_id && (
              <div className="space-y-4">
                <h4 className="font-medium">Arbeitszeiten für {getEmployeeName(assignment.employee_id)}</h4>
                
                {WEEKDAYS.map(({ key, label }) => {
                  const objectHours = getObjectHoursForDay(key);
                  const totalHours = getTotalHoursForDay(key);
                  const assignedHours = (assignment as any)[`assigned_${key}_hours`] as number | null;
                  const startTime = (assignment as any)[`assigned_${key}_start_time`] as string | null;
                  const endTime = (assignment as any)[`assigned_${key}_end_time`] as string | null;

                  if (!objectHours || objectHours === 0) return null;

                  return (
                    <div key={key} className="grid grid-cols-4 gap-4 items-end">
                      <div>
                        <Label className="text-sm">{label}</Label>
                        <div className="text-xs text-muted-foreground">
                          Objekt: {objectHours}h | Gesamt: {totalHours}h
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Startzeit</Label>
                        <Input
                          type="time"
                          value={startTime || ''}
                          onChange={(e) => updateEmployeeStartTime(index, key, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Stunden</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={objectHours}
                          value={assignedHours || ''}
                          onChange={(e) => updateEmployeeHours(index, key, e.target.value ? parseFloat(e.target.value) : null)}
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Endzeit</Label>
                        <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm">
                          <Clock className="h-4 w-4 mr-2" />
                          {endTime || '--:--'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <Button onClick={addEmployee} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Mitarbeiter hinzufügen
        </Button>

        {objectHours && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Objektarbeitszeiten Übersicht</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {WEEKDAYS.map(({ key, label }) => {
                const objectDayHours = getObjectHoursForDay(key);
                const totalAssigned = getTotalHoursForDay(key);
                
                if (!objectDayHours || objectDayHours === 0) return null;
                
                return (
                  <div key={key} className="flex justify-between">
                    <span>{label}:</span>
                    <span className={totalAssigned > objectDayHours + 0.1 ? 'text-red-600 font-medium' : ''}>
                      {totalAssigned}h / {objectDayHours}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}