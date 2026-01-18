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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, calculateEndTime, calculateStartTime } from "@/lib/utils";
import { format, parseISO } from "date-fns";
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
  Calendar,
  CalendarIcon,
  Loader2,
  Plus,
  X,
  ChevronsUpDown,
  Building2,
  FileText,
  PlusCircle,
  Clock,
  Users,
  CalendarRange,
} from "lucide-react";
import { useFormUnsavedChangesForCreate } from "@/components/ui/unsaved-changes-context";
import { useUnsavedChanges } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import {
  preprocessNumber,
  timeRegex,
  dayNames,
  germanDayNames,
  dailyScheduleSchema,
  weeklyScheduleSchema,
} from "@/lib/utils/form-utils";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog";

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
type SingleShiftFormInput = z.input<typeof singleShiftSchema>;
type RecurringShiftFormInput = z.input<typeof recurringShiftSchema>;

const weekdays = [
  { value: 0, label: "So", short: "So" },
  { value: 1, label: "Mo", short: "Mo" },
  { value: 2, label: "Di", short: "Di" },
  { value: 3, label: "Mi", short: "Mi" },
  { value: 4, label: "Do", short: "Do" },
  { value: 5, label: "Fr", short: "Fr" },
  { value: 6, label: "Sa", short: "Sa" },
];

export function CreateShiftDialog({
  open,
  onOpenChange,
  onSuccess,
  availableEmployees = [],
  availableObjects = [],
  availableOrders = [],
  availableServices = [],
  availableCustomers = [],
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

  // Filtered objects based on search
  const filteredObjects = React.useMemo(() => {
    if (!objectSearch.trim()) return availableObjects;
    const searchLower = objectSearch.toLowerCase();
    return availableObjects.filter(obj =>
      obj.name.toLowerCase().includes(searchLower) ||
      (obj.address && obj.address.toLowerCase().includes(searchLower))
    );
  }, [availableObjects, objectSearch]);

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

  const { fields: dailySchedulesFields, replace: replaceDailySchedules } = useFieldArray({
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
        // Get current number of weeks from form or use default
        const currentSchedules = form.getValues("assigned_daily_schedules") || [];
        const weeksNeeded = Math.max(currentSchedules.length, Number(recurrenceInterval || 1), 1);

        // Use the first week's schedule as template for all weeks
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

  const filteredOrders = React.useMemo(() => {
    if (!selectedObjectId) return availableOrders;
    const ordersForObject = availableOrders.filter(o => o.object_id === selectedObjectId);
    if (!orderSearch.trim()) return ordersForObject;
    const searchLower = orderSearch.toLowerCase();
    return ordersForObject.filter(o =>
      o.title.toLowerCase().includes(searchLower) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchLower))
    );
  }, [availableOrders, selectedObjectId, orderSearch]);

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

  // Calculate duration in hours from start and end time strings
  const calculateDurationHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
    return Math.round((diffMinutes / 60) * 100) / 100;
  };

  // Calculate total working hours (duration + travel - break)
  const calculateTotalHours = (
    startTime: string,
    endTime: string,
    travelMinutes: number,
    breakMinutes: number
  ): number => {
    const duration = calculateDurationHours(startTime, endTime);
    const travelHours = travelMinutes / 60;
    const breakHours = breakMinutes / 60;
    return Math.round((duration + travelHours - breakHours) * 100) / 100;
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
        // Single shift mode - use simple time inputs
        const startTime = data.startTime || "08:00";
        const endTime = data.endTime || "17:00";
        const travelMinutes = Number(data.travelTimeMinutes) || 0;
        const breakMinutes = Number(data.breakTimeMinutes) || 0;
        const estimatedHours = calculateTotalHours(startTime, endTime, travelMinutes, breakMinutes);

        // Create a single shift for each employee
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
        // Recurring shift mode - use weekly schedules
        const schedules: { [key: string]: { hours: number; start: string; end: string } } = {};
        const activeWeekdays: number[] = [];

        const firstWeek = (data.assigned_daily_schedules || [])[0] || {};
        console.log("[CREATE-SHIFT] firstWeek raw:", JSON.stringify(firstWeek));
        dayNames.forEach((day, index) => {
          const daySchedule = firstWeek[day] as { hours?: number; start?: string; end?: string } | undefined;
          console.log(`[CREATE-SHIFT] day ${day} (index ${index}):`, daySchedule);
          if (daySchedule && typeof daySchedule.hours === 'number' && daySchedule.hours > 0) {
            schedules[day] = {
              hours: daySchedule.hours,
              start: daySchedule.start || "08:00",
              end: daySchedule.end || "16:00",
            };
            // Map dayNames index to getDay() index:
            // dayNames: [monday=0, tuesday=1, wednesday=2, thursday=3, friday=4, saturday=5, sunday=6]
            // getDay(): [sunday=0, monday=1, tuesday=2, wednesday=3, thursday=4, friday=5, saturday=6]
            // Formula: (index + 1) % 7
            const getDayIndex = (index + 1) % 7;
            activeWeekdays.push(getDayIndex);
          }
        });

        console.log("[CREATE-SHIFT] schedules to send:", JSON.stringify(schedules));
        console.log("[CREATE-SHIFT] activeWeekdays (getDay format):", activeWeekdays);

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
          travel_time_minutes: 0, // For recurring shifts, travel/break can be set per shift later
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

  // Calculate object working hours comparison
  const getObjectWorkingHours = (day: typeof dayNames[number]) => {
    if (!selectedObject?.daily_schedules?.[0]?.[day]) return null;
    return selectedObject.daily_schedules[0][day].hours || 0;
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
          {/* Object Selection */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Objekt *</Label>
            <Controller
              name="objectId"
              control={form.control}
              render={({ field }) => (
                <Popover open={objectSelectOpen} onOpenChange={setObjectSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={objectSelectOpen}
                      className="w-full justify-between"
                    >
                      {field.value ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{availableObjects.find(obj => obj.id === field.value)?.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Objekt auswählen...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Objekt suchen..."
                        value={objectSearch}
                        onValueChange={setObjectSearch}
                      />
                      <CommandList className="max-h-[280px] overflow-y-auto">
                        <CommandGroup heading="Objekte" className="sticky top-0 bg-background">
                          {filteredObjects.slice(0, 10).map((obj) => (
                            <CommandItem
                              key={obj.id}
                              value={obj.name}
                              onSelect={() => {
                                form.setValue("objectId", obj.id);
                                form.setValue("orderId", "");
                                setObjectSelectOpen(false);
                                setObjectSearch("");
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span className="truncate flex-1">{obj.name}</span>
                                {obj.address && (
                                  <span className="text-xs text-muted-foreground shrink-0">{obj.address}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                          {filteredObjects.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-3">
                              Keine Objekte gefunden
                            </div>
                          )}
                          {filteredObjects.length > 10 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              +{filteredObjects.length - 10} weitere Objekte...
                            </div>
                          )}
                        </CommandGroup>
                        <CommandGroup className="border-t">
                          <CommandItem
                            onSelect={() => {
                              setObjectSelectOpen(false);
                              setCreateObjectDialogOpen(true);
                            }}
                            className="text-primary font-medium"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Neues Objekt erstellen
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />

            {/* Create Object Dialog */}
            <ObjectCreateDialog
              open={createObjectDialogOpen}
              onOpenChange={setCreateObjectDialogOpen}
              hideTrigger={true}
              onObjectCreated={(newObjectId) => {
                if (newObjectId) {
                  form.setValue("objectId", newObjectId);
                  form.setValue("orderId", ""); // Reset order when object changes
                  toast.success("Objekt erfolgreich erstellt");
                }
              }}
            />
          </div>

          {/* Order Selection */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Auftrag *</Label>
            <Popover open={orderSelectOpen} onOpenChange={setOrderSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={orderSelectOpen}
                  className="w-full justify-between"
                  disabled={!selectedObjectId}
                >
                  {form.getValues("orderId") ? (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{filteredOrders.find(o => o.id === form.getValues("orderId"))?.title}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {selectedObjectId ? "Auftrag auswählen..." : "Zuerst Objekt auswählen..."}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Auftrag suchen..."
                    value={orderSearch}
                    onValueChange={setOrderSearch}
                  />
                  <CommandList className="max-h-[280px] overflow-y-auto">
                    <CommandGroup heading="Aufträge" className="sticky top-0 bg-background">
                      {filteredOrders.slice(0, 10).map((order) => (
                        <CommandItem
                          key={order.id}
                          value={order.title}
                          onSelect={() => {
                            form.setValue("orderId", order.id);
                            setOrderSelectOpen(false);
                            setOrderSearch("");
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{order.title}</span>
                            {order.customer_name && (
                              <span className="text-xs text-muted-foreground shrink-0">{order.customer_name}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                      {filteredOrders.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-3">
                          Keine Aufträge gefunden
                        </div>
                      )}
                      {filteredOrders.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          +{filteredOrders.length - 10} weitere Aufträge...
                        </div>
                      )}
                    </CommandGroup>
                    <CommandGroup className="border-t">
                      <CommandItem
                        onSelect={() => {
                          setOrderSelectOpen(false);
                          setCreateOrderDialogOpen(true);
                        }}
                        className="text-primary font-medium"
                        disabled={!selectedObjectId}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Neuen Auftrag erstellen
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Create Order Dialog */}
            <OrderCreateDialog
              open={createOrderDialogOpen}
              onOpenChange={setCreateOrderDialogOpen}
              hideTrigger={true}
              objectId={selectedObjectId}
              onOrderCreated={() => {
                toast.success("Auftrag erfolgreich erstellt");
              }}
            />
          </div>

          {/* Shift Type */}
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">Einsatzart:</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => form.setValue("shiftType", 'single')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  form.getValues("shiftType") === 'single'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5 inline" />
                Einmalig
              </button>
              <button
                type="button"
                onClick={() => form.setValue("shiftType", 'recurring')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  form.getValues("shiftType") === 'recurring'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <CalendarRange className="h-3.5 w-3.5 mr-1.5 inline" />
                Wiederholend
              </button>
            </div>
          </div>

          {/* Date Selection */}
          <div className={cn("grid gap-3", form.getValues("shiftType") === 'recurring' ? "grid-cols-2" : "grid-cols-1")}>
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                {form.getValues("shiftType") === 'recurring' ? "Startdatum" : "Datum"}
              </Label>
              <Controller
                name="shiftDate"
                control={form.control}
                render={({ field }) => (
                  <Input type="date" {...field} />
                )}
              />
            </div>
            {form.getValues("shiftType") === 'recurring' && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Enddatum</Label>
                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field }) => (
                    <Input type="date" {...field} min={form.getValues("shiftDate")} />
                  )}
                />
              </div>
            )}
          </div>

          {/* Conditional Section based on shiftType */}
          {form.getValues("shiftType") === 'single' ? (
            /* Single Shift Mode: Time inputs with auto-calculated duration */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Einsatzzeit</h3>

              {/* Start and End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime" className="text-sm text-muted-foreground mb-1.5 block">Von</Label>
                  <Controller
                    name="startTime"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="startTime"
                        type="time"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e);
                          // Trigger recalculation
                          form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                        }}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-sm text-muted-foreground mb-1.5 block">Bis</Label>
                  <Controller
                    name="endTime"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="endTime"
                        type="time"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e);
                          // Trigger recalculation
                          form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                        }}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Duration Display */}
              <div className="p-4 rounded-lg border bg-muted/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dauer</span>
                  <span className="text-lg font-semibold">
                    {calculateDurationHours(form.getValues("startTime") || "00:00", form.getValues("endTime") || "00:00")} Std.
                  </span>
                </div>
              </div>

              {/* Travel Time and Break Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="travelTimeMinutes" className="text-sm text-muted-foreground mb-1.5 block">Fahrtzeit (Min.)</Label>
                  <Controller
                    name="travelTimeMinutes"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="travelTimeMinutes"
                        type="number"
                        min="0"
                        value={Number(field.value) || 0}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                        }}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="breakTimeMinutes" className="text-sm text-muted-foreground mb-1.5 block">Pausenzeit (Min.)</Label>
                  <Controller
                    name="breakTimeMinutes"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="breakTimeMinutes"
                        type="number"
                        min="0"
                        value={Number(field.value) || 0}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger(["startTime", "endTime", "travelTimeMinutes", "breakTimeMinutes"]);
                        }}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Lohnzeit (Total Working Hours) */}
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Lohnzeit (Gesamt)</span>
                  <span className="text-xl font-bold text-primary">
                    {calculateTotalHours(
                      form.getValues("startTime") || "00:00",
                      form.getValues("endTime") || "00:00",
                      Number(form.getValues("travelTimeMinutes") || 0),
                      Number(form.getValues("breakTimeMinutes") || 0)
                    )} Std.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Recurring Shift Mode: Weekly schedule grid */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Zeitplan</h3>

              {/* Import Object Schedules Toggle */}
              <div className="flex items-center gap-2">
                <Controller
                  name="importSchedules"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="importSchedules"
                      checked={field.value}
                      disabled={!selectedObject || !selectedObject.daily_schedules?.length}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                        // Import schedules from object when checked
                        if (checked && selectedObject?.daily_schedules?.length) {
                          const objectSchedules = selectedObject.daily_schedules[0];
                          dailySchedulesFields.forEach((_, weekIndex) => {
                            dayNames.forEach(day => {
                              const daySchedule = objectSchedules[day];
                              if (daySchedule && typeof daySchedule.hours === 'number' && daySchedule.hours > 0) {
                                form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, {
                                  hours: daySchedule.hours,
                                  start: daySchedule.start || "08:00",
                                  end: daySchedule.end || calculateEndTime(daySchedule.start || "08:00", daySchedule.hours),
                                });
                              } else {
                                form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, { hours: null, start: null, end: null });
                              }
                            });
                          });
                        }
                        // Clear schedules when unchecked
                        if (!checked) {
                          dailySchedulesFields.forEach((_, weekIndex) => {
                            dayNames.forEach(day => {
                              form.setValue(`assigned_daily_schedules.${weekIndex}.${day}`, { hours: null, start: null, end: null });
                            });
                          });
                        }
                      }}
                    />
                  )}
                />
                <Label htmlFor="importSchedules" className="text-sm cursor-pointer">
                  Zeitplan vom Objekt übernehmen
                </Label>
                {!selectedObject?.daily_schedules?.length && (
                  <span className="text-xs text-muted-foreground">
                    (keine Zeitpläne vorhanden)
                  </span>
                )}
              </div>

              {/* Recurrence Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                <div>
                  <Label htmlFor="assigned_recurrence_interval_weeks">Wiederholt sich alle X Wochen</Label>
                  <Controller
                    name="assigned_recurrence_interval_weeks"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="assigned_recurrence_interval_weeks"
                        type="number"
                        step="1"
                        min="1"
                        max="52"
                        {...field as any}
                        value={Number(field.value) || 1}
                        onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                      />
                    )}
                  />
                  {(form.formState.errors as any).assigned_recurrence_interval_weeks && (
                    <p className="text-red-500 text-sm mt-1">{(form.formState.errors as any).assigned_recurrence_interval_weeks.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="assigned_start_week_offset">Start-Wochen-Offset (0-basierend)</Label>
                  <Controller
                    name="assigned_start_week_offset"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="assigned_start_week_offset"
                        type="number"
                        step="1"
                        min="0"
                        max={recurrenceInterval > 1 ? recurrenceInterval - 1 : 0}
                        {...field as any}
                        value={Number(field.value) || 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    )}
                  />
                  {(form.formState.errors as any).assigned_start_week_offset && (
                    <p className="text-red-500 text-sm mt-1">{(form.formState.errors as any).assigned_start_week_offset.message}</p>
                  )}
                </div>
              </div>

              {/* Dynamic Week Schedules */}
              {dailySchedulesFields.map((weekSchedule, weekIndex) => (
                <div key={weekSchedule.id} className="border p-4 rounded-md space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base">
                      Woche {weekIndex + 1} (Offset {(startWeekOffset + weekIndex) % recurrenceInterval})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {dayNames.map(day => {
                      const hoursFieldName = `assigned_daily_schedules.${weekIndex}.${day}.hours` as const;
                      const startFieldName = `assigned_daily_schedules.${weekIndex}.${day}.start` as const;
                      const endFieldName = `assigned_daily_schedules.${weekIndex}.${day}.end` as const;

                      const objectHours = getObjectWorkingHours(day);
                      const assignedHours = form.getValues(hoursFieldName);

                      return (
                        <div key={day} className="border p-3 rounded-md space-y-2 relative">
                          <h5 className="font-medium text-sm">{germanDayNames[day]}</h5>

                          {/* Object working hours comparison */}
                          {objectHours !== null && objectHours > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              Objekt: {objectHours.toFixed(2)}h
                            </div>
                          )}

                          <div>
                            <Label htmlFor={hoursFieldName} className="text-xs">Stunden</Label>
                            <Controller
                              name={hoursFieldName}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  id={hoursFieldName}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="24"
                                  value={Number(field.value) || 0}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleDailyHoursChange(weekIndex, day, e.target.value);
                                  }}
                                  className={cn(
                                    objectHours !== null && assignedHours !== objectHours &&
                                    assignedHours !== undefined && assignedHours !== null
                                      ? "border-amber-500/50 focus-visible:border-amber-500" : ""
                                  )}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <Label htmlFor={startFieldName} className="text-xs">Startzeit</Label>
                            <Controller
                              name={startFieldName}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  id={startFieldName}
                                  type="time"
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleDailyStartTimeChange(weekIndex, day, e.target.value);
                                  }}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <Label htmlFor={endFieldName} className="text-xs">Endzeit</Label>
                            <Controller
                              name={endFieldName}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  id={endFieldName}
                                  type="time"
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleDailyEndTimeChange(weekIndex, day, e.target.value);
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Object Working Hours Overview */}
              {selectedObject?.daily_schedules?.[0] && (
                <div className="border p-4 rounded-md bg-muted/10">
                  <h4 className="font-semibold text-sm mb-3">Objektarbeitszeiten Übersicht</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map(day => {
                      const hours = getObjectWorkingHours(day);
                      if (hours === null) return null;
                      return (
                        <div key={day} className="text-center">
                          <div className="text-xs text-muted-foreground">{germanDayNames[day]}</div>
                          <div className="text-sm font-medium">{hours.toFixed(2)}h</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
                          onSelect={() => {
                            handleEmployeeSelect(emp.id);
                          }}
                        >
                          <div className={cn(
                            "mr-2 h-4 w-4 rounded border",
                            form.getValues("employeeIds")?.includes(emp.id)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          )}>
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
