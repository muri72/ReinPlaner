import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTask, createTask } from "./actions"; // createTask auch importieren
import { TaskEditDialog } from "@/components/task-edit-dialog"; // Importiere die neue Komponente
import { Badge } from "@/components/ui/badge"; // Importiere Badge für Statusanzeige
import { DeleteTaskButton } from "@/components/delete-task-button"; // Importiere die neue Komponente

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Aufgaben:", error);
    return <div className="p-8">Fehler beim Laden der Aufgaben.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'; // Oder 'success' wenn verfügbar
      case 'in_progress':
        return 'secondary'; // Oder 'info'
      case 'pending':
      default:
        return 'outline'; // Oder 'warning'
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Aufgaben</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">Noch keine Aufgaben vorhanden. Fügen Sie eine hinzu!</p>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{task.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <TaskEditDialog task={task} /> {/* Bearbeiten-Button */}
                  {/* Verwende die neue Client-Komponente für den Lösch-Button */}
                  <DeleteTaskButton taskId={task.id} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{task.description}</p>
                <div className="flex items-center mt-2">
                  <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground ml-auto">Fällig: {new Date(task.due_date).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neue Aufgabe hinzufügen</h2>
      <TaskForm onSubmit={createTask} submitButtonText="Aufgabe hinzufügen" />
    </div>
  );
}