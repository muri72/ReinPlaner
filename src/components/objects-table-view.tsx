"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound, ArrowUp, ArrowDown, Building } from "lucide-react"; // Added Building
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

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
  monday_start_time: string | null;
  monday_end_time: string | null;
  tuesday_start_time: string | null;
  tuesday_end_time: string | null;
  wednesday_start_time: string | null;
  wednesday_end_time: string | null;
  thursday_start_time: string | null;
  thursday_end_time: string | null;
  friday_start_time: string | null;
  friday_end_time: string | null;
  saturday_start_time: string | null;
  saturday_end_time: string | null;
  sunday_start_time: string | null;
  sunday_end_time: string | null;
  monday_hours: number | null;
  tuesday_hours: number | null;
  wednesday_hours: number | null;
  thursday_hours: number | null;
  friday_hours: number | null;
  saturday_hours: number | null;
  sunday_hours: number | null;
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
  sortColumn: string;
  sortDirection: string;
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
  sortColumn,
  sortDirection,
}: ObjectsTableViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, router, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

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
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('name')} className="px-0 hover:bg-transparent">
                Name {renderSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('customers.name')} className="px-0 hover:bg-transparent">
                Kunde {renderSortIcon('customers.name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button variant="ghost" onClick={() => handleSort('address')} className="px-0 hover:bg-transparent">
                Adresse {renderSortIcon('address')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('priority')} className="px-0 hover:bg-transparent">
                Priorität {renderSortIcon('priority')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('time_of_day')} className="px-0 hover:bg-transparent">
                Tageszeit {renderSortIcon('time_of_day')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('access_method')} className="px-0 hover:bg-transparent">
                Zugang {renderSortIcon('access_method')}
              </Button>
            </TableHead>
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
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <ObjectEditDialog object={object} />
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