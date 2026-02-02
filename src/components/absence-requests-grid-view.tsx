"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, User, Plane, Umbrella, GraduationCap, Clock, FileText, Edit2, Trash2 } from "lucide-react";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { absenceTypeConfig, typeTranslations, statusConfig } from "@/lib/absence-type-config";
import { calculateWorkingDays } from "@/lib/utils/date-utils";
import { createClient } from "@/lib/supabase/client";
import * as React from "react";

interface DisplayAbsenceRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  employees: { first_name: string | null; last_name: string | null } | null;
  user_id: string;
}

interface AbsenceRequestsGridViewProps {
  requests: DisplayAbsenceRequest[];
  query: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
  onActionSuccess: () => void;
}

// Separate component to handle async duration calculation
function RequestCard({
  request,
  typeStyle,
  currentUserRole,
  currentUserId,
  onActionSuccess,
  getDuration,
  formatDateRange,
}: {
  request: DisplayAbsenceRequest;
  typeStyle: { bg: string; border: string; text: string; icon: React.ReactNode; lightBg: string };
  currentUserRole: string;
  currentUserId: string;
  onActionSuccess: () => void;
  getDuration: (startDate: string, endDate: string, employeeId: string, type: string) => Promise<string>;
  formatDateRange: (startDate: string, endDate: string) => string;
}) {
  const [duration, setDuration] = React.useState<string>('...');

  React.useEffect(() => {
    const calculateDuration = async () => {
      const result = await getDuration(request.start_date, request.end_date, request.employee_id, request.type);
      setDuration(result);
    };
    calculateDuration();
  }, [request.start_date, request.end_date, request.employee_id, request.type, getDuration]);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Color strip at top */}
      <div className={cn("h-1.5", typeStyle.bg)} />

      <CardContent className="p-3 space-y-2.5">
        {/* Header: Type badge + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
            typeStyle.lightBg,
            typeStyle.border
          )}>
            <span className={cn("shrink-0", typeStyle.text)}>
              {typeStyle.icon}
            </span>
            <span className={cn("text-xs font-bold", typeStyle.text)}>
              {typeTranslations[request.type] || 'Abwesenheit'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <AbsenceRequestEditDialog
              request={request}
              currentUserRole={currentUserRole as 'admin' | 'manager' | 'employee'}
              currentUserId={currentUserId}
              onRequestUpdated={onActionSuccess}
            />
            <DeleteAbsenceRequestButton
              requestId={request.id}
              onDeleteSuccess={onActionSuccess}
            />
          </div>
        </div>

        {/* Employee name - only shown if not employee role */}
        {currentUserRole !== 'employee' && request.employees && (
          <div className="flex items-center gap-1.5 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">
              {request.employees.first_name} {request.employees.last_name}
            </span>
          </div>
        )}

        {/* Date range with better contrast */}
        <div className="flex items-start gap-1.5">
          <CalendarOff className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="text-sm block font-medium text-foreground">
              {formatDateRange(request.start_date, request.end_date)}
            </span>
            {/* Duration with darker text for better contrast */}
            <span className="text-xs font-bold text-foreground/90 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {(() => {
              const statusStyle = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = statusStyle.icon;
              return (
                <>
                  <StatusIcon className={cn("h-4 w-4", statusStyle.iconColor)} />
                  <Badge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'destructive' : 'warning'} className="text-xs h-5">
                    {request.status === 'pending' ? 'Ausstehend' : request.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                  </Badge>
                </>
              );
            })()}
          </div>
        </div>

        {/* Notes - if present */}
        {request.notes && (
          <div className="flex items-start gap-1.5 text-xs bg-muted/40 rounded-md p-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-foreground/80 line-clamp-2">{request.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AbsenceRequestsGridView({
  requests,
  query,
  currentUserRole,
  currentUserId,
  onActionSuccess,
}: AbsenceRequestsGridViewProps) {
  const supabase = createClient();

  // Cache for employee working days data
  const workingDaysCache = React.useRef<Map<string, number>>(new Map());

  // Get working days for an employee (with caching)
  const getWorkingDaysPerWeek = async (employeeId: string): Promise<number> => {
    if (workingDaysCache.current.has(employeeId)) {
      return workingDaysCache.current.get(employeeId)!;
    }

    const { data } = await supabase
      .from('employees')
      .select('working_days_per_week')
      .eq('id', employeeId)
      .single();

    const workingDays = data?.working_days_per_week || 5;
    workingDaysCache.current.set(employeeId, workingDays);
    return workingDays;
  };

  const typeConfig: { [key: string]: { bg: string; border: string; text: string; icon: React.ReactNode; lightBg: string; badgeBg: string } } = {
    vacation: {
      bg: "bg-gradient-to-r from-blue-600 to-blue-700",
      border: absenceTypeConfig.vacation.border,
      text: "text-blue-800 dark:text-blue-200",
      lightBg: absenceTypeConfig.vacation.bg,
      badgeBg: absenceTypeConfig.vacation.bg,
      icon: <Plane className="h-5 w-5" />,
    },
    sick_leave: {
      bg: "bg-gradient-to-r from-rose-600 to-rose-700",
      border: absenceTypeConfig.sick_leave.border,
      text: "text-rose-800 dark:text-rose-200",
      lightBg: absenceTypeConfig.sick_leave.bg,
      badgeBg: absenceTypeConfig.sick_leave.bg,
      icon: <Umbrella className="h-5 w-5" />,
    },
    training: {
      bg: "bg-gradient-to-r from-teal-600 to-teal-700",
      border: absenceTypeConfig.training.border,
      text: "text-teal-800 dark:text-teal-200",
      lightBg: absenceTypeConfig.training.bg,
      badgeBg: absenceTypeConfig.training.bg,
      icon: <GraduationCap className="h-5 w-5" />,
    },
    unpaid_leave: {
      bg: "bg-gradient-to-r from-violet-600 to-violet-700",
      border: "border-violet-300 dark:border-violet-700",
      text: "text-violet-800 dark:text-violet-200",
      lightBg: "bg-violet-100 dark:bg-violet-900/60",
      badgeBg: "bg-violet-100 dark:bg-violet-900/60",
      icon: <Clock className="h-5 w-5" />,
    },
  };

  const getDuration = async (startDate: string, endDate: string, employeeId: string, type: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // For all absence types, calculate working days based on employee's schedule
    const workingDaysPerWeek = await getWorkingDaysPerWeek(employeeId);
    const workingDays = calculateWorkingDays(start, end, workingDaysPerWeek);
    return workingDays === 1 ? '1 Tag' : `${workingDays} Tage`;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'dd.', { locale: de })} - ${format(end, 'dd. MMM yyyy', { locale: de })}`;
    }
    return `${format(start, 'dd. MMM', { locale: de })} - ${format(end, 'dd. MMM yyyy', { locale: de })}`;
  };

  if (requests.length === 0 && !query) {
    return (
      <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
        <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Keine Anträge gefunden</p>
        <p className="text-xs text-muted-foreground mt-1">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
        <div className="mt-4">
          <AbsenceRequestCreateDialog
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onAbsenceRequestCreated={onActionSuccess}
          />
        </div>
      </div>
    );
  }

  if (requests.length === 0 && query) {
    return (
      <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
        <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Keine Anträge gefunden</p>
        <p className="text-xs text-muted-foreground mt-1">Ihre Suche ergab keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {requests.map((request) => {
        const typeStyle = typeConfig[request.type] || typeConfig.other;

        return (
          <RequestCard
            key={request.id}
            request={request}
            typeStyle={typeStyle}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onActionSuccess={onActionSuccess}
            getDuration={getDuration}
            formatDateRange={formatDateRange}
          />
        );
      })}
    </div>
  );
}
