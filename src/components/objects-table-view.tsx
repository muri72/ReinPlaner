"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound, Building, Eye } from "lucide-react"; // Added Building and Eye
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { PaginationControls } from "@/components/pagination-controls";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import Link from "next/link";

interface DisplayObject {
  id: string;
  user_id: string | null;
  customer_id: string;
  name: string;
  address: string;
  description: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_contact_id: string | null;
  object_leader_first_name: string | null;
  object_leader_last_name: string | null;
  notes: string | null;
  priority: string;
  time_of_day: string;
  access_method: string;
  pin: string | null;
  is_alarm_secured: boolean;
  alarm_password: string | null;
  security_code_word: string | null;
  daily_schedules: any[]; // Updated to JSONB array
  recurrence_interval_weeks: number;
  start_week_offset: number;
}

interface ObjectsTableViewProps {
  objects: DisplayObject[];
  totalPages: number;
  currentPage: number;
  query: string;
  customerIdFilter: string;
  priorityFilter: string;
  timeOfDayFilter: string;
  accessMethodFilter: string;
}

export function ObjectsTableView({
  objects,
  totalPages,
  currentPage,
  query,
  customerIdFilter,
  priorityFilter,
  timeOfDayFilter,
  accessMethodFilter,
}: ObjectsTableViewProps) {

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  if (objects.length === 0 && !query && !customerIdFilter && !priorityFilter && !timeOfDayFilter && !accessMethodFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Objekte vorhanden</p>
        <p className="text-sm">Fügen Sie ein neues Objekt hinzu, um es zu verwalten.</p>
      </div>
    );
  }

  if (objects.length === 0 && (query || customerIdFilter || priorityFilter || timeOfDayFilter || accessMethodFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Objekte gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card"> {/* Added styling here */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Name</TableHead>
            <TableHead className="min-w-[120px]">Kunde</TableHead>
            <TableHead className="min-w-[200px]">Adresse</TableHead>
            <TableHead className="min-w-[120px]">Priorität</TableHead>
            <TableHead className="min-w-[120px]">Tageszeit</TableHead>
            <TableHead className="min-w-[120px]">Zugang</TableHead>
            <TableHead className="min-w-[120px]">Wiederholung</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((object) => (
            <TableRow key={object.id}>
              <TableCell className="font-medium text-sm">{object.name}</TableCell>
              <TableCell className="text-sm">{object.customer_name || 'N/A'}</TableCell>
              <TableCell className="text-sm">{object.address}</TableCell>
              <TableCell className="text-sm">
                <Badge variant={getPriorityBadgeVariant(object.priority)}>{object.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm">{object.time_of_day}</TableCell>
              <TableCell className="text-sm">{object.access_method}</TableCell>
              <TableCell className="text-sm">
                {object.recurrence_interval_weeks > 1 ? `Alle ${object.recurrence_interval_weeks} Wo. (Offset: ${object.start_week_offset})` : 'Jede Woche'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/objects/${object.id}`} title="Details anzeigen">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}