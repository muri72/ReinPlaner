"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTask } from "@/app/dashboard/tasks/actions"; // Importiere die Server-Aktion
import { useActionState, useFormStatus } from "react-dom"; // FIX: Import von "react" zu "react-dom" geändert

interface DeleteTaskButtonProps {
  taskId: string;
}

export function DeleteTaskButton({ taskId }: DeleteTaskButtonProps) {
  // useActionState nimmt die Server-Aktion und einen initialen Zustand entgegen.
  // Es gibt [state, formAction] zurück.
  const [state, formAction] = useActionState(deleteTask, { success: false, message: "" });
  const { pending } = useFormStatus(); // Um den Ladezustand anzuzeigen

  useEffect(() => {
    // Zeige Toast nur an, wenn das Formular abgeschickt wurde und der Zustand sich geändert hat
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive/80"
        type="submit"
        disabled={pending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}