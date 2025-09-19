"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarOff } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { Button } from "./ui/button";

interface AbsenceRequest {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
}

interface EmployeeAbsencesListProps {
  absences: AbsenceRequest[];
}

export function EmployeeAbsencesList({ absences }: EmployeeAbsencesListProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'warning';
    }
  };

  const typeTranslations: { [key: string]: string } = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    other: "Sonstiges",
  };

  if (absences.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Keine Abwesenheiten für diesen Mitarbeiter gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Typ</TableHead>
            <TableHead>Startdatum</TableHead>
            <TableHead>Enddatum</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notizen</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {absences.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{typeTranslations[request.type] || request.type}</TableCell>
              <TableCell>{format(new Date(request.start_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell>{format(new Date(request.end_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell><Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge></TableCell>
              <TableCell className="truncate max-w-xs">{request.notes || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/absence-requests?query=${request.id}`}>
                    Zum Antrag
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}