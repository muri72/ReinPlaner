"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CheckCircle2, XCircle, User } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface AbsenceRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  employees: {
    first_name: string | null;
    last_name: string | null;
    user_id?: string;
  } | null;
  user_id: string;
}

interface AbsenceRequestDetailTabsProps {
  absenceRequest: AbsenceRequest;
  currentUserId: string;
  currentUserRole: "admin" | "manager" | "employee" | "customer" | "platform_admin";
  onUpdate?: () => void;
}

export function AbsenceRequestDetailTabs({
  absenceRequest,
  currentUserId,
  currentUserRole,
  onUpdate,
}: AbsenceRequestDetailTabsProps) {
  const [adminNotes, setAdminNotes] = useState(absenceRequest.admin_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const isAdminOrManager = currentUserRole === "admin" || currentUserRole === "manager";
  const canApprove = isAdminOrManager && absenceRequest.status === "pending";
  const isOwner = absenceRequest.user_id === currentUserId;

  const handleApprove = async () => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("absence_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
      })
      .eq("id", absenceRequest.id);

    if (error) {
      toast.error("Fehler beim Genehmigen: " + error.message);
    } else {
      toast.success("Antrag genehmigt");
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      toast.error("Bitte geben Sie einen Ablehnungsgrund ein.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from("absence_requests")
      .update({
        status: "rejected",
        admin_notes: adminNotes,
      })
      .eq("id", absenceRequest.id);

    if (error) {
      toast.error("Fehler beim Ablehnen: " + error.message);
    } else {
      toast.success("Antrag abgelehnt");
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    const labels: Record<string, string> = {
      pending: "Ausstehend",
      approved: "Genehmigt",
      rejected: "Abgelehnt",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100"}>{labels[status] || status}</Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Urlaub",
      sick_leave: "Krankheit",
      training: "Weiterbildung",
      unpaid_leave: "Unbezahlter Urlaub",
    };
    return labels[type] || type;
  };

  const startDate = new Date(absenceRequest.start_date);
  const endDate = new Date(absenceRequest.end_date);
  const daysDiff = differenceInDays(endDate, startDate) + 1;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="calendar">Kalenderansicht</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Abwesenheitsantrag</CardTitle>
              {getStatusBadge(absenceRequest.status)}
            </div>
            <CardDescription>
              Eingereicht am{" "}
              {format(new Date(absenceRequest.start_date), "dd. MMMM yyyy", {
                locale: de,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee Info */}
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {absenceRequest.employees
                  ? [absenceRequest.employees.first_name, absenceRequest.employees.last_name]
                      .filter(Boolean)
                      .join(" ")
                  : "Unbekannter Mitarbeiter"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Typ:</span>
                <p className="mt-1">{getTypeLabel(absenceRequest.type)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Dauer:</span>
                <p className="mt-1">{daysDiff} Tag{daysDiff !== 1 ? "e" : ""}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Startdatum:</span>
                <p className="mt-1">{format(startDate, "dd.MM.yyyy", { locale: de })}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Enddatum:</span>
                <p className="mt-1">{format(endDate, "dd.MM.yyyy", { locale: de })}</p>
              </div>
            </div>

            {absenceRequest.notes && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Notizen:</span>
                <p className="mt-1 text-sm whitespace-pre-wrap">{absenceRequest.notes}</p>
              </div>
            )}

            {absenceRequest.admin_notes && (
              <div className="bg-muted/50 p-3 rounded-md">
                <span className="text-sm font-medium text-muted-foreground">
                  Admin-Notizen:
                </span>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {absenceRequest.admin_notes}
                </p>
              </div>
            )}

            {/* Admin Actions */}
            {canApprove && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Antrag bearbeiten</h4>
                <Textarea
                  placeholder="Notizen hinzufügen (Pflicht bei Ablehnung)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Genehmigen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Ablehnen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Kalenderansicht</CardTitle>
            <CardDescription>
              {format(startDate, "MMMM yyyy", { locale: de })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple calendar representation */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">
                    {format(startDate, "dd.")} - {format(endDate, "dd. MMMM yyyy", { locale: de })}
                  </span>
                  <Badge variant="outline">{getTypeLabel(absenceRequest.type)}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {daysDiff} Tag{daysDiff !== 1 ? "e" : ""} Abwesenheit
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}