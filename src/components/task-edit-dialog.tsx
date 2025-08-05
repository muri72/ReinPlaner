"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { TaskForm, TaskFormValues } from "@/components/task-form";
import { updateTask } from "@/app/dashboard/tasks/actions";

interface TaskEditDialogProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
  };
}

export function TaskEditDialog({ task }: TaskEditDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpdate = async (data: TaskFormValues) => {
    const result = await updateTask(task.id, data);
    if (result.success) {
      setOpen(false); // Dialog schließen bei Erfolg
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Aufgabe bearbeiten</DialogTitle>
        </DialogHeader>
        <TaskForm
          initialData={{
            title: task.title,
            description: task.description || undefined, // null zu undefined konvertieren
            dueDate: task.due_date ? new Date(task.due_date) : undefined, // string zu Date konvertieren
            status: task.status as TaskFormValues["status"],
          }}
          onSubmit={handleUpdate}
          submitButtonText="Änderungen speichern"
          onSuccess={() => setOpen(false)} // Schließt den Dialog nach erfolgreicher Aktualisierung
        />
      </DialogContent>
    </Dialog>
  );
}