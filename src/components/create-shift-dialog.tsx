"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { createJobWithSeries } from "@/lib/actions/shift-planning";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  object_id: z.string().min(1, "Objekt ist erforderlich"),
  service_id: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  estimated_hours: z.coerce.number().positive("Stunden müssen positiv sein"),
  start_date: z.date({
    required_error: "Startdatum ist erforderlich",
  }),
  end_date: z.date().optional(),
  pattern_type: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  weekdays: z.array(z.string()).min(1, "Mindestens ein Wochentag muss ausgewählt sein"),
  daily_schedules: z.array(z.any()),
}).refine((data) => data.weekdays.length > 0, {
  message: "Mindestens ein Wochentag muss ausgewählt sein",
  path: ["weekdays"],
});

interface CreateShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  employeeIds?: string[];
  orderId?: string;
}

interface OrderOption {
  id: string;
  title: string;
  customer: string;
}

export function CreateShiftDialog({
  open,
  onClose,
  onSuccess,
  defaultDate,
  employeeIds = [],
  orderId,
}: CreateShiftDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = React.useState<string[]>([]);
  const [assignedSchedules, setAssignedSchedules] = React.useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [orders, setOrders] = React.useState<OrderOption[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      object_id: "",
      priority: "medium",
      estimated_hours: 8,
      start_date: defaultDate || new Date(),
      pattern_type: "weekly",
      weekdays: [],
      daily_schedules: [],
    },
  });

  const weekdays = [
    { id: "monday", label: "Montag" },
    { id: "tuesday", label: "Dienstag" },
    { id: "wednesday", label: "Mittwoch" },
    { id: "thursday", label: "Donnerstag" },
    { id: "friday", label: "Freitag" },
    { id: "saturday", label: "Samstag" },
    { id: "sunday", label: "Sonntag" },
  ];

  // Load orders when dialog opens
  const loadOrders = React.useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("orders")
        .select("id, title, customer_id, customers(name)")
        .eq("status", "active")
        .order("title");

      if (error) throw error;

      if (data) {
        const ordersList: OrderOption[] = data.map((order: any) => ({
          id: order.id,
          title: order.title,
          customer: order.customers?.name || "Unbekannt",
        }));
        setOrders(ordersList);
      }
    } catch (error: any) {
      console.error("Error loading orders:", error);
      toast.error("Fehler beim Laden der Aufträge");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Fetch assigned schedules when order is selected
  const fetchAssignedSchedules = React.useCallback(async (orderId: string) => {
    if (!orderId) {
      setAssignedSchedules([]);
      setSelectedWeekdays([]);
      form.setValue("weekdays", []);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("order_employee_assignments")
        .select("assigned_daily_schedules")
        .eq("order_id", orderId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Use the first assignment's schedules
        const schedules = data[0].assigned_daily_schedules || [];
        setAssignedSchedules(schedules);

        // Auto-select weekdays that have hours > 0
        const validWeekdays: string[] = [];
        if (schedules && schedules.length > 0) {
          schedules.forEach((schedule: any) => {
            weekdays.forEach(({ id }) => {
              const daySchedule = schedule[id];
              if (daySchedule && daySchedule.hours > 0 && !validWeekdays.includes(id)) {
                validWeekdays.push(id);
              }
            });
          });
        }
        setSelectedWeekdays(validWeekdays);
        form.setValue("weekdays", validWeekdays);

        toast.success("Zeitplan automatisch aus den Mitarbeiter-Zuordnungen geladen");
      }
    } catch (error: any) {
      console.error("Error fetching assigned schedules:", error);
      toast.error("Fehler beim Laden der Zeitpläne");
    }
  }, []);

  // Effect to load orders when dialog opens
  React.useEffect(() => {
    if (open) {
      loadOrders();
    }
  }, [open, loadOrders]);

  // Effect to fetch schedules when orderId prop changes
  React.useEffect(() => {
    if (orderId) {
      setSelectedOrderId(orderId);
      fetchAssignedSchedules(orderId);
    }
  }, [orderId, fetchAssignedSchedules]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedWeekdays([]);
      setAssignedSchedules([]);
      setSelectedOrderId("");
    }
  }, [open, form]);

  const handleWeekdayToggle = (weekdayId: string) => {
    const newSelected = selectedWeekdays.includes(weekdayId)
      ? selectedWeekdays.filter((id) => id !== weekdayId)
      : [...selectedWeekdays, weekdayId];
    setSelectedWeekdays(newSelected);
    form.setValue("weekdays", newSelected);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Use assigned schedules if available, otherwise create default schedules
      let dailySchedules: any[];

      if (assignedSchedules && assignedSchedules.length > 0) {
        // Use the assigned schedules from the order
        dailySchedules = assignedSchedules;
        toast.success("Verwende Zeitpläne aus den Mitarbeiter-Zuordnungen");
      } else {
        // Create default daily schedules based on selected weekdays
        dailySchedules = Array.from({ length: 1 }, () => {
          const schedule: any = {};
          selectedWeekdays.forEach((day) => {
            schedule[day] = {
              hours: values.estimated_hours,
              start: "09:00",
              end: `${9 + Math.floor(values.estimated_hours)}:00`,
            };
          });
          return schedule;
        });
        toast.info("Erstelle Standard-Zeitpläne");
      }

      const result = await createJobWithSeries({
        title: values.title,
        object_id: values.object_id,
        service_id: values.service_id,
        estimated_hours: values.estimated_hours,
        priority: values.priority,
        pattern_type: values.pattern_type,
        weekdays: selectedWeekdays,
        daily_schedules: dailySchedules,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: values.end_date ? format(values.end_date, "yyyy-MM-dd") : undefined,
        employee_ids: employeeIds.length > 0 ? employeeIds : undefined,
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
        form.reset();
        setSelectedWeekdays([]);
        setAssignedSchedules([]);
        setSelectedOrderId("");
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neuen Einsatz erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Einsatz oder eine wiederkehrende Serie.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auftrag auswählen</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedOrderId(value);
                      fetchAssignedSchedules(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={ordersLoading ? "Lade Aufträge..." : "Auftrag auswählen"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.title} - {order.customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Wählen Sie einen Auftrag aus, um automatisch die Mitarbeiter-Zeitpläne zu laden.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="object_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objekt</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Objekt auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* TODO: Load objects from API */}
                        <SelectItem value="object-1">Hauptsitz</SelectItem>
                        <SelectItem value="object-2">Filiale A</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Service auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* TODO: Load services from API */}
                        <SelectItem value="service-1">Büroreinigung</SelectItem>
                        <SelectItem value="service-2">Fensterreinigung</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="estimated_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stunden</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" min="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorität</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Normal</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pattern_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                        <SelectItem value="biweekly">14-tägig</SelectItem>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Startdatum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: de })
                            ) : (
                              <span>Datum auswählen</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Enddatum (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: de })
                            ) : (
                              <span>Enddatum wählen</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="weekdays"
              render={() => (
                <FormItem>
                  <FormLabel>Wochentage</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {weekdays.map((day) => (
                      <Button
                        key={day.id}
                        type="button"
                        variant={selectedWeekdays.includes(day.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleWeekdayToggle(day.id)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  <FormDescription>
                    {assignedSchedules && assignedSchedules.length > 0 ? (
                      <span className="text-green-600 font-medium">
                        ✓ Zeitpläne automatisch aus Mitarbeiter-Zuordnungen geladen
                      </span>
                    ) : (
                      "Wählen Sie die Wochentage für wiederkehrende Einsätze aus."
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Einsatz erstellen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
