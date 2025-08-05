"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createTask } from "@/app/dashboard/tasks/actions.ts"; // Pfad korrigiert
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional(),
  dueDate: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskForm() {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: undefined,
    },
  });

  const onSubmit = async (data: TaskFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description || '');
    if (data.dueDate) {
      formData.append('dueDate', data.dueDate.toISOString());
    }

    const result = await createTask(formData);

    if (result.success) {
      toast.success(result.message);
      form.reset(); // Formular zurücksetzen nach erfolgreicher Erstellung
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-md">
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
        {form.formState.isSubmitting ? "Aufgabe hinzufügen..." : "Aufgabe hinzufügen"}
      </Button>
    </form>
  );
}