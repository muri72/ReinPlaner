"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, Calendar, Clock, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { absenceTypeConfig, typeTranslations, statusConfig } from "@/lib/absence-type-config";

// Default fallback for unknown types
const defaultTypeConfig = {
  bg: "bg-gray-100 dark:bg-gray-800",
  border: "border-gray-300 dark:border-gray-700",
  text: "text-gray-800 dark:text-gray-200",
};

interface Absence {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
}

interface EmployeeData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  contract_type: string | null;
  vacation_balance: number | null;
  vacation_days_used: number | null;
  working_days_per_week: number | null;
}

interface EmployeeAbsencesListProps {
  absences: Absence[];
  employee?: EmployeeData | null;
}

export function EmployeeAbsencesList({ absences, employee }: EmployeeAbsencesListProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'warning';
    }
  };

  // Calculate vacation data dynamically from employee data
  const vacationBalance = employee?.vacation_balance || 30;
  const vacationDaysUsed = employee?.vacation_days_used || 0;
  const remainingVacation = vacationBalance - vacationDaysUsed;
  const usagePercent = (vacationDaysUsed / vacationBalance) * 100;

  const getContractTypeLabel = (type: string | null) => {
    switch (type) {
      case 'full_time': return 'Vollzeit';
      case 'part_time': return 'Teilzeit';
      case 'minijob': return 'Minijob';
      case 'freelancer': return 'Freiberufler';
      default: return 'Unbekannt';
    }
  };

  if (absences.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
        <CalendarOff className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-semibold">Keine Abwesenheiten für diesen Mitarbeiter erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Employee Summary Card - Compact */}
      {employee && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
          {/* Contract Type */}
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vertrag</p>
              <p className="text-sm font-medium">{getContractTypeLabel(employee.contract_type)}</p>
            </div>
          </div>

          {/* Vacation Balance with Progress */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-full p-1.5",
              remainingVacation <= 5 ? "bg-amber-100 dark:bg-amber-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"
            )}>
              <Calendar className={cn(
                "h-4 w-4",
                remainingVacation <= 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Urlaub</p>
                <Badge variant={remainingVacation <= 5 ? "warning" : "secondary"} className="text-xs h-5">
                  {vacationDaysUsed} / {vacationBalance} Tage
                </Badge>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mt-1">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usagePercent >= 90 ? "bg-red-500" :
                    usagePercent >= 75 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absences Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Typ</TableHead>
              <TableHead className="text-xs font-semibold">Start</TableHead>
              <TableHead className="text-xs font-semibold">Ende</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold max-w-[200px]">Notizen</TableHead>
              <TableHead className="text-right text-xs font-semibold">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {absences.map((absence) => {
              const typeStyle = absenceTypeConfig[absence.type] || defaultTypeConfig;
              const statusStyle = statusConfig[absence.status] || statusConfig.pending;
              const StatusIcon = statusStyle.icon;

              return (
                <TableRow key={absence.id} className="hover:bg-muted/50">
                  <TableCell className="py-2">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border",
                      typeStyle.bg,
                      typeStyle.border,
                      typeStyle.text
                    )}>
                      <typeStyle.icon className="h-3.5 w-3.5" />
                      {typeTranslations[absence.type] || absence.type}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-2">{format(new Date(absence.start_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
                  <TableCell className="text-sm py-2">{format(new Date(absence.end_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", statusStyle.iconColor)} />
                      <Badge variant={getStatusBadgeVariant(absence.status)} className="text-xs">
                        {absence.status === 'approved' ? 'Genehmigt' : absence.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-2 max-w-[200px] truncate" title={absence.notes || undefined}>
                    {absence.notes || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/absence-requests`}>
                        Zum Antrag
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
