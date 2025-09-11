"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button";
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";
import { formatDuration } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/pagination-controls";
import { RecordDetailsDialog } from "@/components/record-details-dialog";

interface DisplayTimeEntry {
  id: string;
  user_id: string;
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  type: string;
  notes: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

interface AdminTimeEntriesOverviewProps {
  timeEntries: DisplayTimeEntry[];
  loading: boolean;
  totalPages: number;
  currentPage: number;
  currentUserId: string;
  isAdmin: boolean;
}

export function AdminTimeEntriesOverview({
  timeEntries,
  loading,
  totalPages,
  currentPage,
  currentUserId,
  isAdmin,
}: AdminTimeEntriesOverviewProps) {

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'manual':
        return 'outline';
      case 'clock_in_out':
        return 'default';
      case 'stopwatch':
        return 'secondary';
      case 'automatic_scheduled_order':
        return 'success';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[100px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="min-w-[200px]"><Skeleton className="h-6 w-full" /></TableHead>
              <TableHead className="text-right min-w-[120px]"><Skeleton className="h-6 w-full" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Startzeit</TableHead>
            <TableHead className="min-w-[120px]">Endzeit</TableHead>
            <TableHead className="min-w-[120px]">Dauer (Brutto)</TableHead>
            <TableHead className="min-w-[120px]">Pause</TableHead>
            <TableHead className="min-w-[120px]">Mitarbeiter</TableHead>
            <TableHead className="min-w-[120px]">Kunde</TableHead>
            <TableHead className="min-w-[120px]">Objekt</TableHead>
            <TableHead className="min-w-[120px]">Auftrag</TableHead>
            <TableHead className="min-w-[100px]">Typ</TableHead>
            <TableHead className="min-w-[200px]">Notizen</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeEntries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                Keine Zeiteinträge für diese Filter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            timeEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-sm">{new Date(entry.start_time).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{entry.end_time ? new Date(entry.end_time).toLocaleString() : 'N/A'}</TableCell>
                <TableCell className="text-sm">{formatDuration(entry.duration_minutes)}</TableCell>
                <TableCell className="text-sm">{formatDuration(entry.break_minutes)}</TableCell>
                <TableCell className="text-sm">
                  {entry.employee_first_name && entry.employee_last_name
                    ? `${entry.employee_first_name} ${entry.employee_last_name}`
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-sm">{entry.customer_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">{entry.object_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">{entry.order_title || 'N/A'}</TableCell>
                <TableCell><Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge></TableCell>
                <TableCell className="text-sm">{entry.notes || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <RecordDetailsDialog record={entry} title={`Details zu Zeiteintrag`} />
                    <TimeEntryEditDialog timeEntry={entry} currentUserId={currentUserId} isAdmin={isAdmin} />
                    <DeleteTimeEntryButton entryId={entry.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}