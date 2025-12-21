"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils";
import { MultiSelectEmployees } from "./multi-select-employees";
import { updateOrderAssignments } from "@/app/dashboard/planning/actions";
import { Skeleton } from "./ui/skeleton";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDialogUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import {
  preprocessNumber,
  timeRegex,
  dayNames,
  germanDayNames,
  dailyScheduleSchema,
  weeklyScheduleSchema,
} from "@/lib/utils/form-utils";

const assignmentEditSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "Mindestens ein Mitarbeiter muss zugewiesen sein."),
  assigned_daily_schedules: z.array(weeklyScheduleSchema).default([]),
  assigned_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  assigned_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
}).superRefine((data, ctx) => {
  if (data.assigned_daily_schedules.length !== data.assigned_recurrence_interval_weeks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Die Anzahl der Wochenpläne muss dem Wiederholungsintervall (${data.assigned_recurrence_interval_weeks}) entsprechen.`,
      path: ["assigned_daily_schedules"],
    });
  }
});

type AssignmentEditFormInput = z.input<typeof assignmentEditSchema>;

interface AssignmentEditDialogProps {
  orderId: string;
  children: React.ReactNode;
  onSuccess: () => void;
}

export function AssignmentEditDialog({ orderId, children, onSuccess }: AssignmentEditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [showConfirmClose, setShowConfirmClose] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [allEmployees, setAllEmployees] = React.useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [orderTitle, setOrderTitle] = React.useState("");
  const [availableDays, setAvailableDays] = React.useState<typeof dayNames[number][]>([]);
  const { isDirty } = useDialogUnsavedChanges();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && isDirty) {
      setShowConfirmClose(true);
    } else {
      setOpen(nextOpen);
    }
  };

  const form = useForm<AssignmentEditFormInput>({
    resolver: zodResolver(assignmentEditSchema),
    defaultValues: {
      employeeIds: [],
      assigned_daily_schedules: [],
      assigned_recurrence_interval_weeks: 1,
      assigned_start_week_offset: 0,
    },
    mode: "onChange",
  });

  const { fields: dailySchedulesFields, replace: replaceDailySchedules } = useFieldArray({
    control: form.control,
    name: "assigned_daily_schedules",
  });

  const recurrenceInterval = Number(form.watch("assigned_recurrence_interval_weeks") ?? 1);
  const startWeekOffset = Number(form.watch("assigned_start_week_offset") ?? 0);

  React.useEffect(() => {
    const currentLength = dailySchedulesFields.length;
    const newLength = Number(recurrenceInterval || 1);
    if (currentLength !== newLength) {
      const newSchedules = Array.from({ length: newLength }, (_, i) => form.getValues(`assigned_daily_schedules.${i}`) || {}) as any[];
      replaceDailySchedules(newSchedules as any);
    }
  }, [recurrenceInterval, dailySchedulesFields.length, replaceDailySchedules, form]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      setLoading(true);
      const supabase = createClient();

      const { data: employeesData } = await supabase.from('employees').select('id, first_name, last_name').eq('status', 'active');
      setAllEmployees(employeesData || []);

      const { data: orderData } = await supabase.from('orders').select('title, order_employee_assignments(*), objects ( daily_schedules )').eq('id', orderId).single();
      if (orderData) {
        setOrderTitle(orderData.title);
        const firstAssignment = orderData.order_employee_assignments[0];
        form.reset({
          employeeIds: orderData.order_employee_assignments.map(a => a.employee_id),
          assigned_daily_schedules: firstAssignment?.assigned_daily_schedules || [],
          assigned_recurrence_interval_weeks: firstAssignment?.assigned_recurrence_interval_weeks || 1,
          assigned_start_week_offset: firstAssignment?.assigned_start_week_offset || 0,
        });
        // Extract available days from object daily_schedules
        const objectData = Array.isArray(orderData.objects) ? orderData.objects[0] : orderData.objects;
        if (objectData?.daily_schedules && Array.isArray(objectData.daily_schedules)) {
          // Extract day names from daily_schedules that have hours > 0
          const available = dayNames.filter(day => {
            const daySchedule = objectData.daily_schedules.find((ds: any) => ds.day === day);
            return daySchedule && daySchedule.hours && daySchedule.hours > 0;
          });
          setAvailableDays(available);
        } else {
          // If no daily_schedules, all days are available
          setAvailableDays([...dayNames]);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [open, orderId, form]);

  const handleFormSubmit: SubmitHandler<AssignmentEditFormInput> = async (data) => {
    const payload = {
      employeeIds: data.employeeIds,
      assigned_daily_schedules: data.assigned_daily_schedules ?? [],
      assigned_recurrence_interval_weeks: Number(data.assigned_recurrence_interval_weeks) || 1,
      assigned_start_week_offset: Number(data.assigned_start_week_offset) || 0,
    };
    const result = await updateOrderAssignments(orderId, payload);
    handleActionResponse(result);
    if (result.success) {
      setOpen(false);
      onSuccess();
    }
  };

  const handleDailyHoursChange = React.useCallback((weekIndex: number, day: typeof dayNames[number], value: string) => {
    const parsedHours = value === "" ? null : Number(value);
    const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, hours: parsedHours }, { shouldValidate: true });
    const startTime = currentSchedule.start;
    if (parsedHours != null && parsedHours > 0 && startTime && timeRegex.test(startTime)) {
      form.setValue(`assigned_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(startTime, parsedHours), { shouldValidate: true });
    }
  }, [form]);

  const handleDailyStartTimeChange = React.useCallback((weekIndex: number, day: typeof dayNames[number], value: string) => {
    const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, start: value || null }, { shouldValidate: true });
    const hoursRaw = (currentSchedule as any).hours;
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw ?? NaN);
    if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`assigned_daily_schedules.${weekIndex}.${day}.end`, calculateEndTime(value, hours), { shouldValidate: true });
    }
  }, [form]);

  const handleDailyEndTimeChange = React.useCallback((weekIndex: number, day: typeof dayNames[number], value: string) => {
    const currentSchedule = form.getValues(`assigned_daily_schedules.${weekIndex}.${day}`) || {};
    form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, { ...currentSchedule, end: value || null }, { shouldValidate: true });
    const hoursRaw = (currentSchedule as any).hours;
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw ?? NaN);
    if (hours != null && !isNaN(hours) && hours > 0 && value && timeRegex.test(value)) {
      form.setValue(`assigned_daily_schedules.${weekIndex}.${day}.start`, calculateStartTime(value, hours), { shouldValidate: true });
    }
  }, [form]);

  const handleCopyDayToAllWeeks = (sourceWeekIndex: number, sourceDay: typeof dayNames[number]) => {
    const sourceSchedule = form.getValues(`assigned_daily_schedules.${sourceWeekIndex}.${sourceDay}`);
    if (!sourceSchedule?.hours && !sourceSchedule?.start && !sourceSchedule?.end) {
      toast.info("Keine Zeiten zum Kopieren vorhanden.");
      return;
    }
    let copiedCount = 0;
    dailySchedulesFields.forEach((_field, weekIndex) => {
      if (weekIndex !== sourceWeekIndex) {
        form.setValue(`assigned_daily_schedules.${weekIndex}.${sourceDay}`, sourceSchedule, { shouldValidate: true });
        copiedCount++;
      }
    });
    if (copiedCount > 0) toast.success(`Zeiten für ${germanDayNames[sourceDay]} wurden in ${copiedCount} weitere Wochen kopiert.`);
    else toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
  };

  const handleCopyWeekToAllWeeks = (sourceWeekIndex: number) => {
    const sourceWeekSchedule = form.getValues(`assigned_daily_schedules.${sourceWeekIndex}`);
    if (!sourceWeekSchedule || Object.keys(sourceWeekSchedule).length === 0) {
      toast.info("Kein Wochenplan zum Kopieren vorhanden.");
      return;
    }
    let copiedCount = 0;
    dailySchedulesFields.forEach((_field, weekIndex) => {
      if (weekIndex !== sourceWeekIndex) {
        // Create a new schedule for all days of the week
        const newSchedule: any = {};
        // Set all days to the source values (or empty if not available in source)
        dayNames.forEach(day => {
          if (availableDays.includes(day) && sourceWeekSchedule[day]) {
            newSchedule[day] = sourceWeekSchedule[day];
          }
          // If day is not available in source or not in availableDays, leave it empty
        });
        // Set the complete schedule (this will overwrite all existing values)
        form.setValue(`assigned_daily_schedules.${weekIndex}`, newSchedule, { shouldValidate: true });
        copiedCount++;
      }
    });
    if (copiedCount > 0) {
      const dayNamesStr = availableDays.map(d => germanDayNames[d]).join(', ');
      toast.success(`Wochenplan von Woche ${sourceWeekIndex + 1} wurde in ${copiedCount} weitere Wochen kopiert (nur verfügbare Tage: ${dayNamesStr}).`);
    } else {
      toast.info("Keine weiteren Wochen zum Kopieren gefunden.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col glassmorphism-card">
        <DialogHeader>
          <DialogTitle>Einsatz bearbeiten: {orderTitle}</DialogTitle>
          <DialogDescription>
            Passen Sie das zugewiesene Team und den Zeitplan für diesen Auftrag an.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/4" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-grow overflow-y-auto pr-4 space-y-4">
            <div>
              <Label>Zugewiesene Mitarbeiter</Label>
              <Controller
                name="employeeIds"
                control={form.control}
                render={({ field }) => (
                  <MultiSelectEmployees
                    employees={allEmployees}
                    selectedEmployeeIds={field.value}
                    onSelectionChange={field.onChange}
                  />
                )}
              />
              {form.formState.errors.employeeIds && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeIds.message}</p>}
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Zugewiesener Zeitplan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assigned_recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
                  <Input id="assigned_recurrence_interval_weeks" type="number" step="1" min="1" max="52" {...form.register("assigned_recurrence_interval_weeks")} />
                  {form.formState.errors.assigned_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{form.formState.errors.assigned_recurrence_interval_weeks.message}</p>}
                </div>
                <div>
                  <Label htmlFor="assigned_start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
                  <Input id="assigned_start_week_offset" type="number" step="1" min="0" max={(Number(recurrenceInterval || 1) - 1)} {...form.register("assigned_start_week_offset")} />
                  {form.formState.errors.assigned_start_week_offset && <p className="text-red-500 text-sm mt-1">{form.formState.errors.assigned_start_week_offset.message}</p>}
                </div>
              </div>
              {form.formState.errors.assigned_daily_schedules && <p className="text-red-500 text-sm mt-1">{form.formState.errors.assigned_daily_schedules.message}</p>}
              {dailySchedulesFields.map((weekSchedule, weekIndex) => (
                <div key={weekSchedule.id} className="border p-4 rounded-md space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base">Woche {weekIndex + 1} (Offset {(startWeekOffset + weekIndex) % recurrenceInterval})</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleCopyWeekToAllWeeks(weekIndex)} disabled={recurrenceInterval === 1}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Diesen Wochenplan in alle anderen Wochen kopieren</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {dayNames.map(day => {
                      const hoursFieldName = `assigned_daily_schedules.${weekIndex}.${day}.hours` as const;
                      const startFieldName = `assigned_daily_schedules.${weekIndex}.${day}.start` as const;
                      const endFieldName = `assigned_daily_schedules.${weekIndex}.${day}.end` as const;
                      return (
                        <div key={day} className="border p-3 rounded-md space-y-2">
                          <h5 className="font-medium text-sm">{germanDayNames[day]}</h5>
                          <div>
                            <Label htmlFor={hoursFieldName} className="text-xs">Stunden</Label>
                            <Input id={hoursFieldName} type="number" step="0.01" min="0" max="24" {...form.register(hoursFieldName)} onChange={(e) => handleDailyHoursChange(weekIndex, day, e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor={startFieldName} className="text-xs">Startzeit</Label>
                            <Input id={startFieldName} type="time" {...form.register(startFieldName)} onChange={(e) => handleDailyStartTimeChange(weekIndex, day, e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor={endFieldName} className="text-xs">Endzeit</Label>
                            <Input id={endFieldName} type="time" {...form.register(endFieldName)} onChange={(e) => handleDailyEndTimeChange(weekIndex, day, e.target.value)} />
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleCopyDayToAllWeeks(weekIndex, day)} disabled={recurrenceInterval === 1}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Zeiten für diesen Tag in alle anderen Wochen kopieren</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="sticky bottom-0 bg-background/80 backdrop-blur-sm py-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Speichern..." : "Änderungen speichern"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      <UnsavedChangesAlert
        open={showConfirmClose}
        onConfirm={() => {
          setShowConfirmClose(false);
          setOpen(false);
        }}
        onCancel={() => setShowConfirmClose(false)}
        title="Ungespeicherte Änderungen verwerfen?"
        description="Wenn Sie das Dialog jetzt schließen, gehen Ihre Eingaben verloren."
      />
    </Dialog>
  );
}