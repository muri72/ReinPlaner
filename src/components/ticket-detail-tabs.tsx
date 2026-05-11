"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, User, AlertCircle, CheckCircle2, MessageSquare, History } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface TicketComment {
  id: string;
  created_at: string;
  user_id: string;
  content: string;
  creator_first_name?: string | null;
  creator_last_name?: string | null;
}

interface TicketHistory {
  id: string;
  created_at: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name?: string | null;
}

interface Ticket {
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
  comments: TicketComment[];
  customer_name: string | null;
  object_name: string | null;
  creator_first_name: string | null;
  creator_last_name: string | null;
  assigned_to_first_name: string | null;
  assigned_to_last_name: string | null;
}

interface TicketDetailTabsProps {
  ticket: Ticket;
  currentUserId: string;
  currentUserRole: "admin" | "manager" | "employee" | "customer" | "platform_admin";
  onUpdate?: () => void;
}

export function TicketDetailTabs({
  ticket,
  currentUserId,
  currentUserRole,
  onUpdate,
}: TicketDetailTabsProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);
  const [newAssignee, setNewAssignee] = useState(ticket.assigned_to_user_id || "");
  const [editing, setEditing] = useState(false);
  const supabase = createClient();

  const isAdminOrManager = currentUserRole === "admin" || currentUserRole === "manager";

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("Bitte geben Sie einen Kommentar ein.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticket.id,
      user_id: currentUserId,
      content: newComment.trim(),
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen des Kommentars: " + error.message);
    } else {
      toast.success("Kommentar hinzugefügt");
      setNewComment("");
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const handleUpdateTicket = async () => {
    setIsSubmitting(true);
    const updates: Record<string, any> = {};

    if (newStatus !== ticket.status) updates.status = newStatus;
    if (newPriority !== ticket.priority) updates.priority = newPriority;
    if (newAssignee !== (ticket.assigned_to_user_id || "")) {
      updates.assigned_to_user_id = newAssignee || null;
    }

    if (Object.keys(updates).length === 0) {
      setIsSubmitting(false);
      setEditing(false);
      return;
    }

    const { error } = await supabase.from("tickets").update(updates).eq("id", ticket.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    } else {
      toast.success("Ticket aktualisiert");
      setEditing(false);
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    const labels: Record<string, string> = {
      open: "Offen",
      in_progress: "In Bearbeitung",
      resolved: "Gelöst",
      closed: "Geschlossen",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100"}>{labels[status] || status}</Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    const labels: Record<string, string> = {
      low: "Niedrig",
      medium: "Mittel",
      high: "Hoch",
      urgent: "Dringend",
    };
    return (
      <Badge className={variants[priority] || "bg-gray-100"}>{labels[priority] || priority}</Badge>
    );
  };

  const statusOptions = [
    { value: "open", label: "Offen" },
    { value: "in_progress", label: "In Bearbeitung" },
    { value: "resolved", label: "Gelöst" },
    { value: "closed", label: "Geschlossen" },
  ];

  const priorityOptions = [
    { value: "low", label: "Niedrig" },
    { value: "medium", label: "Mittel" },
    { value: "high", label: "Hoch" },
    { value: "urgent", label: "Dringend" },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        <TabsTrigger value="comments">
          Kommentare
          {ticket.comments?.length > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs">{ticket.comments.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">Historie</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{ticket.title}</CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
            </div>
            <CardDescription>
              Erstellt am{" "}
              {format(new Date(ticket.created_at), "dd. MMMM yyyy 'um' HH:mm", { locale: de })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            {ticket.description && (
              <div>
                <h4 className="font-medium mb-2">Beschreibung</h4>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </div>
            )}

            <Separator />

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {ticket.customer_name && (
                <div>
                  <span className="text-muted-foreground">Kunde:</span> {ticket.customer_name}
                </div>
              )}
              {ticket.object_name && (
                <div>
                  <span className="text-muted-foreground">Objekt:</span> {ticket.object_name}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Erstellt von:</span>{" "}
                {[ticket.creator_first_name, ticket.creator_last_name].filter(Boolean).join(" ") ||
                  "Unbekannt"}
              </div>
              <div>
                <span className="text-muted-foreground">Zugewiesen an:</span>{" "}
                {ticket.assigned_to_first_name
                  ? [ticket.assigned_to_first_name, ticket.assigned_to_last_name]
                      .filter(Boolean)
                      .join(" ")
                  : "Nicht zugewiesen"}
              </div>
            </div>

            <Separator />

            {/* Admin Actions */}
            {isAdminOrManager && (
              <div className="space-y-4">
                <h4 className="font-medium">Ticket bearbeiten</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <Select
                      value={editing ? newStatus : ticket.status}
                      onValueChange={(value) => {
                        setEditing(true);
                        setNewStatus(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Priorität</label>
                    <Select
                      value={editing ? newPriority : ticket.priority}
                      onValueChange={(value) => {
                        setEditing(true);
                        setNewPriority(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Zuweisung</label>
                    <Select
                      value={
                        editing
                          ? newAssignee
                          : ticket.assigned_to_user_id || "unassigned"
                      }
                      onValueChange={(value) => {
                        setEditing(true);
                        setNewAssignee(value === "unassigned" ? "" : value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nicht zugewiesen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {editing && (
                  <div className="flex space-x-2">
                    <Button onClick={handleUpdateTicket} disabled={isSubmitting}>
                      {isSubmitting ? "Speichern..." : "Speichern"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setNewStatus(ticket.status);
                        setNewPriority(ticket.priority);
                        setNewAssignee(ticket.assigned_to_user_id || "");
                      }}
                      disabled={isSubmitting}
                    >
                      Abbrechen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comments">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Kommentare</CardTitle>
            <CardDescription>
              {ticket.comments?.length || 0} Kommentar(e)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment List */}
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {comment.creator_first_name
                            ? [comment.creator_first_name, comment.creator_last_name]
                                .filter(Boolean)
                                .join(" ")
                            : "Unbekannt"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd.MM.yyyy HH:mm", {
                          locale: de,
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Noch keine Kommentare vorhanden.
              </p>
            )}

            <Separator />

            {/* Add Comment Form */}
            <div className="space-y-3">
              <h4 className="font-medium">Neuen Kommentar hinzufügen</h4>
              <Textarea
                placeholder="Kommentar eingeben..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
              />
              <Button onClick={handleAddComment} disabled={isSubmitting || !newComment.trim()}>
                {isSubmitting ? "Hinzufügen..." : "Kommentar hinzufügen"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Historie</CardTitle>
            <CardDescription>Änderungen an diesem Ticket.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <History className="mx-auto h-10 w-10 mb-4 text-muted-foreground" />
              <p>Die Historie wird in einer zukünftigen Version verfügbar sein.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}