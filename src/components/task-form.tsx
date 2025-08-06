"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const taskSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional(),
  dueDate: z.date().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).optional().default("pending"),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  initialData?: Partial<TaskFormValues>;
  onSubmit: (data: TaskFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function TaskForm({ initialData, onSubmit, submitButtonText, onSuccess }: TaskFormProps) {
  // Konstruiere Standardwerte, die Partial<TaskFormValues> entsprechen
  // und stelle sicher, dass 'status' immer ein gültiger Enum-String ist.
  const defaultValues: Partial<TaskFormValues> = {
    title: initialData?.title ?? "",
    description: initialData?.description ?? undefined,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
    status: (initialData?.status && ["pending", "in_progress", "completed"].includes(initialData.status))
      ? initialData.status
      : "pending", // Stelle sicher, dass es immer ein gültiger Enum-String ist
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultValues, // Dies sollte nun mit Partial<TaskFormValues> kompatibel sein
  });

  const handleFormSubmit = async (data: TaskFormValues): Promise<void> => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
      <div>
        <Label htmlFor="title">Titel der Aufgabe</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Z.B. Büroreinigung"
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Details zur Aufgabe..."
          rows={4}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value) => form.setValue("status", value as "pending" | "in_progress" | "completed")} value={form.watch("status")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="dueDate">Fälligkeitsdatum (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !form.watch("dueDate") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.watch("dueDate") ? format(form.watch("dueDate")!, "PPP") : <span>Datum auswählen</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={form.watch("dueDate") || undefined}
              onSelect={(date) => form.setValue("dueDate", date || undefined)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.dueDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}