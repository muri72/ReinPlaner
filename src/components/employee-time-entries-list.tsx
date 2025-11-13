"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { Button } from "./ui/button";

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  type: string;
  notes: string | null;
  orders: { title: string | null } | null;
  objects: { name: string | null } | null;
}

interface EmployeeTimeEntriesListProps {
  timeEntries: TimeEntry[];
}

export function EmployeeTimeEntriesList({ timeEntries }: EmployeeTimeEntriesListProps) {
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'manual': return 'outline';
      case 'clock_in_out': return 'default';
      case 'stopwatch': return 'secondary';
      case 'automatic_scheduled_order': return 'success';
      default: return 'outline';
    }
  };

  if (timeEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Keine Zeiteinträge für diesen Mitarbeiter gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Ende</TableHead>
            <TableHead>Dauer</TableHead>
            <TableHead>Auftrag/Objekt</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{format(new Date(entry.start_time), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell>{format(new Date(entry.start_time), 'HH:mm', { locale: de })}</TableCell>
              <TableCell>{entry.end_time ? format(new Date(entry.end_time), 'HH:mm', { locale: de }) : 'Laufend'}</TableCell>
              <TableCell>{formatDuration((entry.duration_minutes || 0) - (entry.break_minutes || 0))}</TableCell>
              <TableCell>{entry.orders?.title || entry.objects?.name || 'N/A'}</TableCell>
              <TableCell><Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/time-tracking?query=${entry.id}`}>
                    Zum Eintrag
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