"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils";
import { Skeleton } from "./ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";

const ticketEditSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(255, "Titel ist zu lang"),
  description: z.string().optional(),
  status: z.string().min(1, "Status ist erforderlich"),
  priority: z.string().min(1, "Priorität ist erforderlich"),
  assigned_to_user_id: z.string().optional().nullable(),
});

type TicketEditFormInput = z.input<typeof ticketEditSchema>;

interface DisplayTicket {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  customer_id: string | null;
  object_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  image_urls: string[] | null;
  comments: any[];
  customer_name: string | null;
  object_name: string | null;
  creator_first_name: string | null;
  creator_last_name: string | null;
  assigned_to_first_name: string | null;
  assigned_to_last_name: string | null;
}

interface TicketEditDialogProps {
  ticket: DisplayTicket;
  onTicketUpdated?: () => void;
}

export function TicketEditDialog({ ticket, onTicketUpdated }: TicketEditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [showConfirmClose, setShowConfirmClose] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [allEmployees, setAllEmployees] = React.useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const { isDirty } = useDialogUnsavedChanges();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && isDirty) {
      setShowConfirmClose(true);
    } else {
      setOpen(nextOpen);
    }
  };

  const form = useForm<TicketEditFormInput>({
    resolver: zodResolver(ticketEditSchema),
    defaultValues: {
      title: ticket.title,
      description: ticket.description || "",
      status: ticket.status,
      priority: ticket.priority,
      assigned_to_user_id: ticket.assigned_to_user_id || "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      setLoading(true);
      const supabase = createClient();

      // Fetch employees for assignment
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');

      setAllEmployees(employeesData || []);

      // Reset form with latest ticket data
      form.reset({
        title: ticket.title,
        description: ticket.description || "",
        status: ticket.status,
        priority: ticket.priority,
        assigned_to_user_id: ticket.assigned_to_user_id ?? "",
      });

      setLoading(false);
    };
    fetchData();
  }, [open, ticket, form]);

  const handleFormSubmit = async (data: TicketEditFormInput) => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('tickets')
      .update({
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        assigned_to_user_id: data.assigned_to_user_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren des Tickets: " + error.message);
      setLoading(false);
    } else {
      toast.success("Ticket erfolgreich aktualisiert");
      setOpen(false);
      onTicketUpdated?.();
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glassmorphism-card">
        <DialogHeader>
          <DialogTitle>Ticket bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Details dieses Tickets. Klicken Sie auf "Speichern", um Ihre Änderungen zu übernehmen.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Kurzer Titel des Tickets"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Detaillierte Beschreibung des Problems"
                rows={4}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Offen</SelectItem>
                        <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                        <SelectItem value="resolved">Gelöst</SelectItem>
                        <SelectItem value="closed">Geschlossen</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorität</Label>
                <Controller
                  name="priority"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priorität auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                        <SelectItem value="urgent">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.priority && (
                  <p className="text-sm text-red-500">{form.formState.errors.priority.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to_user_id">Zugewiesen an</Label>
              <Controller
                name="assigned_to_user_id"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mitarbeiter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nicht zugewiesen</SelectItem>
                      {allEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.assigned_to_user_id && (
                <p className="text-sm text-red-500">{form.formState.errors.assigned_to_user_id.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Speichern..." : "Speichern"}
              </Button>
            </div>
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
