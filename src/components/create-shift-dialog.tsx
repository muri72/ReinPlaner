"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { createShift, createShiftWithSchedule, CreateShiftWithScheduleParams } from "@/lib/actions/shift-planning";
import { toast } from "sonner";
import { handleActionResponse } from "@/lib/toast-utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  X,
  ChevronsUpDown,
  Building2,
  FileText,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { useFormUnsavedChangesForCreate } from "@/components/ui/unsaved-changes-context";
import { useUnsavedChanges } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import {
  preprocessNumber,
  dayNames,
  germanDayNames,
  weeklyScheduleSchema,
} from "@/lib/utils/form-utils";
import {
  ShiftBasicInfoSection,
  ShiftEmployeeSection,
  ShiftScheduleEditor,
  ShiftObjectSelector,
  calculateTotalHours,
} from "@/components/shift-dialogs";

interface ObjectOption {
  id: string;
  name: string;
  address?: string;
  daily_schedules?: any[];
}

interface OrderOption {
  id: string;
  title: string;
  object_id: string;
  object_name?: string;
  customer_name?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableEmployees?: EmployeeOption[];
  availableObjects?: ObjectOption[];
  availableOrders?: OrderOption[];
  availableServices?: ServiceOption[];
  availableCustomers?: CustomerOption[];
}

// Form schema - Single shift mode
const singleShiftSchema = z.object({
  objectId: z.string().uuid("Bitte wählen Sie ein Objekt aus"),
  orderId: z.string().uuid("Bitte wählen Sie einen Auftrag aus"),
  employeeIds: z.array(z.string().uuid()).min(1, "Mindestens ein Mitarbeiter muss zugewiesen sein"),
  shiftType: z.literal('single'),
  shiftDate: z.string().min(1, "Datum ist erforderlich"),
  startTime: z.string().min(1, "Startzeit ist erforderlich"),
  endTime: z.string().min(1, "Endzeit ist erforderlich"),
  travelTimeMinutes: z.preprocess(preprocessNumber, z.number().min(0).default(0)),
  breakTimeMinutes: z.preprocess(preprocessNumber, z.number().min(0).default(0)),
  notes: z.string().optional(),
});

// Form schema - Recurring shift mode
const recurringShiftSchema = z.object({
  objectId: z.string().uuid("Bitte wählen Sie ein Objekt aus"),
  orderId: z.string().uuid("Bitte wählen Sie einen Auftrag aus"),
  employeeIds: z.array(z.string().uuid()).min(1, "Mindestens ein Mitarbeiter muss zugewiesen sein"),
  shiftType: z.literal('recurring'),
  shiftDate: z.string().min(1, "Startdatum ist erforderlich"),
  endDate: z.string().min(1, "Enddatum ist erforderlich"),
  importSchedules: z.boolean().default(true),
  assigned_daily_schedules: z.array(weeklyScheduleSchema).default([]),
  assigned_recurrence_interval_weeks: z.preprocess(preprocessNumber, z.number().min(1).max(52).default(1)),
  assigned_start_week_offset: z.preprocess(preprocessNumber, z.number().min(0).max(51).default(0)),
  notes: z.string().optional(),
});

// Combined schema
const createShiftSchema = z.discriminatedUnion('shiftType', [
  singleShiftSchema,
  recurringShiftSchema,
]);

type CreateShiftFormInput = z.input<typeof createShiftSchema>;

export function CreateShiftDialog({
  open,
  onOpenChange,
  onSuccess,
  availableEmployees = [],
  availableObjects = [],
  availableOrders = [],
}: CreateShiftDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [employeeSelectOpen, setEmployeeSelectOpen] = React.useState(false);
  const [objectSelectOpen, setObjectSelectOpen] = React.useState(false);
  const [orderSelectOpen, setOrderSelectOpen] = React.useState(false);

  // Dialog states for creating new objects/orders
  const [createObjectDialogOpen, setCreateObjectDialogOpen] = React.useState(false);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = React.useState(false);

  // Search states for comboboxes
  const [objectSearch, setObjectSearch] = React.useState("");
  const [orderSearch, setOrderSearch] = React.useState("");

  // Form with react-hook-form
  const form = useForm<CreateShiftFormInput>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      objectId: "",
      orderId: "",
      employeeIds: [],
      shiftType: 'single',
      shiftDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "08:00",
      endTime: "17:00",
      travelTimeMinutes: 0,
      breakTimeMinutes: 0,
      endDate: format(new Date(), "yyyy-MM-dd"),
      importSchedules: true,
      assigned_daily_schedules: [],
      assigned_recurrence_interval_weeks: 1,
      assigned_start_week_offset: 0,
      notes: "",
    } as any,
    mode: "onChange",
  });

  // Register with unsaved changes context
  useFormUnsavedChangesForCreate("create-shift-form", form.formState.isDirty, true);

  // Reset form dirty state after initial setup
  React.useEffect(() => {
    const timer = setTimeout(() => {
      form.reset(form.getValues(), { keepValues: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [form]);

  const { replace: replaceDailySchedules } = useFieldArray({
    control: form.control,
    name: "assigned_daily_schedules",
  });

  const watchedValues = form.watch() as any;
  const recurrenceInterval = Number(watchedValues.assigned_recurrence_interval_weeks ?? 1);
  const startWeekOffset = Number(watchedValues.assigned_start_week_offset ?? 0);
  const importSchedules = watchedValues.importSchedules ?? true;
  const selectedObjectId = watchedValues.objectId;

  // Get selected object for schedule display
  const selectedObject = React.useMemo(() =>
    availableObjects.find(obj => obj.id === selectedObjectId),
    [availableObjects, selectedObjectId]
  );

  // Update field array when recurrence interval changes
  const dailySchedulesFields = watchedValues.assigned_daily_schedules || [];
  React.useEffect(() => {
    const currentLength = dailySchedulesFields.length;
    const newLength = Number(recurrenceInterval || 1);
    if (currentLength !== newLength) {
      const newSchedules = Array.from({ length: newLength }, (_, i) =>
        form.getValues(`assigned_daily_schedules.${i}`) || {}
      ) as any[];
      replaceDailySchedules(newSchedules);
    }
  }, [recurrenceInterval, dailySchedulesFields.length, replaceDailySchedules, form]);

  // Load object schedules when object is selected and import is enabled
  React.useEffect(() => {
    if (!open) return;
    if (selectedObject?.daily_schedules && importSchedules) {
      const schedules = selectedObject.daily_schedules;
      if (schedules && schedules.length > 0) {
        const currentSchedules = form.getValues("assigned_daily_schedules") || [];
        const weeksNeeded = Math.max(currentSchedules.length, Number(recurrenceInterval || 1), 1);

        const weekSchedule = schedules[0];
        const newSchedules = Array.from({ length: weeksNeeded }, () => {
          const weekScheduleCopy: any = {};
          dayNames.forEach(day => {
            if (weekSchedule[day]) {
              weekScheduleCopy[day] = { ...weekSchedule[day] };
            }
          });
          return weekScheduleCopy;
        });
        replaceDailySchedules(newSchedules as any);
      }
    }
  }, [open, selectedObject, importSchedules, recurrenceInterval, replaceDailySchedules, form]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        objectId: "",
        orderId: "",
        employeeIds: [],
        shiftType: 'single',
        shiftDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "08:00",
        endTime: "17:00",
        travelTimeMinutes: 0,
        breakTimeMinutes: 0,
        endDate: format(new Date(), "yyyy-MM-dd"),
        importSchedules: true,
        assigned_daily_schedules: Array.from({ length: 1 }, () => ({})),
        assigned_recurrence_interval_weeks: 1,
        assigned_start_week_offset: 0,
        notes: "",
      } as any);
      setObjectSearch("");
      setOrderSearch("");
    }
  }, [open, form]);

  const handleEmployeeSelect = (employeeId: string) => {
    const current = form.getValues("employeeIds") || [];
    if (current.includes(employeeId)) {
      form.setValue("employeeIds", current.filter(id => id !== employeeId));
    } else {
      form.setValue("employeeIds", [...current, employeeId]);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = availableEmployees.find(e => e.id === id);
    return emp?.name || "Unbekannt";
  };

  const onSubmit: SubmitHandler<CreateShiftFormInput> = async (data) => {
    if (!data.orderId) {
      toast.error("Bitte wählen Sie einen Auftrag aus");
      return;
    }
    if (data.employeeIds.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Mitarbeiter aus");
      return;
    }

    setLoading(true);
    try {
      if (data.shiftType === 'single') {
        const startTime = data.startTime || "08:00";
        const endTime = data.endTime || "17:00";
        const travelMinutes = Number(data.travelTimeMinutes) || 0;
        const breakMinutes = Number(data.breakTimeMinutes) || 0;
        const estimatedHours = calculateTotalHours(startTime, endTime, travelMinutes, breakMinutes);

        for (const employeeId of data.employeeIds) {
          const result = await createShift({
            order_id: data.orderId,
            employee_id: employeeId,
            shift_date: data.shiftDate,
            start_time: startTime,
            end_time: endTime,
            estimated_hours: estimatedHours,
            travel_time_minutes: travelMinutes,
            break_time_minutes: breakMinutes,
            notes: data.notes,
          });

          if (!result.success) {
            toast.error(`Fehler bei Mitarbeiter ${getEmployeeName(employeeId)}: ${result.message}`);
            setLoading(false);
            return;
          }
        }

        toast.success(`${data.employeeIds.length} Einsatz/Einsätze erfolgreich erstellt.`);
        onSuccess();
        onOpenChange(false);
      } else {
        const schedules: { [key: string]: { hours: number; start: string; end: string } } = {};
        const activeWeekdays: number[] = [];

        const firstWeek = (data.assigned_daily_schedules || [])[0] || {};
        dayNames.forEach((day, index) => {
          const daySchedule = firstWeek[day] as { hours?: number; start?: string; end?: string } | undefined;
          if (daySchedule && typeof daySchedule.hours === 'number' && daySchedule.hours > 0) {
            schedules[day] = {
              hours: daySchedule.hours,
              start: daySchedule.start || "08:00",
              end: daySchedule.end || "16:00",
            };
            const getDayIndex = (index + 1) % 7;
            activeWeekdays.push(getDayIndex);
          }
        });

        if (activeWeekdays.length === 0) {
          toast.error("Bitte definieren Sie mindestens einen aktiven Tag");
          setLoading(false);
          return;
        }

        const params: CreateShiftWithScheduleParams = {
          order_id: data.orderId,
          employee_ids: data.employeeIds,
          object_id: data.objectId,
          schedules,
          shift_type: 'recurring',
          shift_date: data.shiftDate,
          recurring_weekdays: activeWeekdays,
          recurring_end_date: data.endDate,
          travel_time_minutes: 0,
          break_time_minutes: 0,
          notes: data.notes,
        };

        const result = await createShiftWithSchedule(params);
        handleActionResponse(result);
        if (result.success) {
          onSuccess();
          onOpenChange(false);
        }
      }
    } catch (error: any) {
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Unsaved changes protection
  const { handleClose, confirmClose, cancelClose, showDialog } = useUnsavedChanges(
    form.formState.isDirty,
    form.formState.isSubmitting
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose(() => onOpenChange(false));
    }
  };

  const shiftType = form.getValues("shiftType");

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 glassmorphism-card">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-lg font-medium flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Neuen Einsatz erstellen
            </DialogTitle>
            <DialogDescription className="text-sm">
              Erstellen Sie einen neuen Einsatz mit Zeitplan und Mitarbeiterzuweisung.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-4 px-4 space-y-4">
            {/* Object & Order Selection */}
            <ShiftObjectSelector
              form={form}
              availableObjects={availableObjects}
              availableOrders={availableOrders}
              objectSearch={objectSearch}
              setObjectSearch={setObjectSearch}
              orderSearch={orderSearch}
              setOrderSearch={setOrderSearch}
              objectSelectOpen={objectSelectOpen}
              setObjectSelectOpen={setObjectSelectOpen}
              orderSelectOpen={orderSelectOpen}
              setOrderSelectOpen={setOrderSelectOpen}
              createObjectDialogOpen={createObjectDialogOpen}
              setCreateObjectDialogOpen={setCreateObjectDialogOpen}
              createOrderDialogOpen={createOrderDialogOpen}
              setCreateOrderDialogOpen={setCreateOrderDialogOpen}
            />

            {/* Basic Info: Shift Type, Date, Time */}
            <ShiftBasicInfoSection form={form} />

            {/* Schedule Editor for Recurring Shifts */}
            {shiftType === 'recurring' && (
              <ShiftScheduleEditor
                form={form}
                selectedObject={selectedObject}
                recurrenceInterval={recurrenceInterval}
                startWeekOffset={startWeekOffset}
                importSchedules={importSchedules}
              />
            )}

            {/* Employee Selection */}
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Mitarbeiter * ({form.getValues("employeeIds")?.length || 0} ausgewählt)
              </Label>
              <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeSelectOpen}
                    className="w-full justify-between h-auto min-h-[38px] flex-wrap"
                  >
                    {form.getValues("employeeIds")?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {form.getValues("employeeIds").map((id: string) => (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {getEmployeeName(id)}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleEmployeeSelect(id);
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Mitarbeiter auswählen...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[300px]" align="start">
                  <Command>
                    <CommandInput placeholder="Mitarbeiter suchen..." />
                    <CommandList className="max-h-[250px] overflow-y-auto">
                      <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                      <CommandGroup heading="Mitarbeiter">
                        {availableEmployees.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={emp.name}
                            onSelect={() => handleEmployeeSelect(emp.id)}
                          >
                            <div
                              className={cn(
                                "mr-2 h-4 w-4 rounded border",
                                form.getValues("employeeIds")?.includes(emp.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              )}
                            >
                              {form.getValues("employeeIds")?.includes(emp.id) && (
                                <Plus className="h-3 w-3 text-primary-foreground mx-auto" />
                              )}
                            </div>
                            {emp.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.formState.errors.employeeIds && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeIds.message}</p>
              )}
            </div>

            {/* Form Errors */}
            {form.formState.errors.root && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-red-600 text-sm">{form.formState.errors.root.message}</p>
              </div>
            )}

            <DialogFooter className="sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 px-4 -mx-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading || form.formState.isSubmitting}>
                {loading || form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Einsatz erstellen
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Alert */}
      <UnsavedChangesAlert
        open={showDialog}
        onConfirm={confirmClose}
        onCancel={cancelClose}
        title="Ungespeicherte Änderungen"
        description="Sie haben ungespeicherte Änderungen. Möchten Sie den Dialog wirklich schließen?"
      />
    </>
  );
}

// Need Label and X/Plus from lucide-react
import { Label } from "@/components/ui/label";
