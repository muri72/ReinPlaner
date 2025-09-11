"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserRound, Building, Briefcase, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { TicketEditDialog } from "@/components/ticket-edit-dialog";
import { DeleteTicketButton } from "@/components/delete-ticket-button";
import { PaginationControls } from "@/components/pagination-controls";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RecordDetailsDialog } from "@/components/record-details-dialog";

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

interface TicketsTableViewProps {
  tickets: DisplayTicket[];
  totalPages: number;
  currentPage: number;
  query: string;
  onTicketUpdated?: () => void;
}

export function TicketsTableView({
  tickets,
  totalPages,
  currentPage,
  query,
  onTicketUpdated,
}: TicketsTableViewProps) {

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'warning';
      case 'resolved': return 'default';
      case 'closed': return 'success';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="mr-1 h-4 w-4" />;
      case 'in_progress': return <Clock className="mr-1 h-4 w-4" />;
      case 'resolved': return <CheckCircle2 className="mr-1 h-4 w-4" />;
      case 'closed': return <XCircle className="mr-1 h-4 w-4" />;
      default: return null;
    }
  };

  if (tickets.length === 0 && !query) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Tickets vorhanden</p>
        <p className="text-sm">Erstellen Sie ein neues Ticket, um Kundenanliegen zu verwalten.</p>
      </div>
    );
  }

  if (tickets.length === 0 && query) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Tickets gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Titel</TableHead>
            <TableHead className="min-w-[120px]">Status</TableHead>
            <TableHead className="min-w-[120px]">Priorität</TableHead>
            <TableHead className="min-w-[150px]">Kunde</TableHead>
            <TableHead className="min-w-[150px]">Objekt</TableHead>
            <TableHead className="min-w-[150px]">Zugewiesen an</TableHead>
            <TableHead className="min-w-[150px]">Erstellt von</TableHead>
            <TableHead className="min-w-[120px]">Erstellt am</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium text-sm">{ticket.title}</TableCell>
              <TableCell className="text-sm">
                <Badge variant={getStatusBadgeVariant(ticket.status)} className="flex items-center w-fit">
                  {getStatusIcon(ticket.status)} {ticket.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm">{ticket.customer_name || 'N/A'}</TableCell>
              <TableCell className="text-sm">{ticket.object_name || 'N/A'}</TableCell>
              <TableCell className="text-sm">
                {ticket.assigned_to_first_name || ticket.assigned_to_last_name
                  ? `${ticket.assigned_to_first_name || ''} ${ticket.assigned_to_last_name || ''}`.trim()
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-sm">
                {ticket.creator_first_name || ticket.creator_last_name
                  ? `${ticket.creator_first_name || ''} ${ticket.creator_last_name || ''}`.trim()
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-sm">{format(new Date(ticket.created_at), 'dd.MM.yyyy', { locale: de })}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <RecordDetailsDialog record={ticket} title={`Details zu Ticket: ${ticket.title}`} />
                  <TicketEditDialog ticket={ticket} onTicketUpdated={onTicketUpdated} />
                  <DeleteTicketButton ticketId={ticket.id} onDeleteSuccess={onTicketUpdated} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}