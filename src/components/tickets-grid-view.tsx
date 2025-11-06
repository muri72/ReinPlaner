"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, UserRound, Building, Clock, Briefcase } from "lucide-react";
import { TicketCreateDialog } from "@/components/ticket-create-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

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

interface TicketsGridViewProps {
  tickets: DisplayTicket[];
  query: string;
  onTicketUpdated?: () => void;
}

export function TicketsGridView({
  tickets,
  query,
  onTicketUpdated,
}: TicketsGridViewProps) {

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

  if (tickets.length === 0 && !query) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Tickets vorhanden</p>
        <p className="text-sm">Erstellen Sie ein neues Ticket, um Kundenanliegen zu verwalten.</p>
        <div className="mt-4">
          <TicketCreateDialog onTicketCreated={onTicketUpdated} />
        </div>
      </div>
    );
  }

  if (tickets.length === 0 && query) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Tickets gefunden</p>
        <p className="text-sm">Ihre Suche ergab keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {tickets.map((ticket) => (
        <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Status: <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge></span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Priorität: <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge></span>
              </div>
              {ticket.customer_name && (
                <div className="flex items-center">
                  <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Kunde: {ticket.customer_name}</span>
                </div>
              )}
              {ticket.object_name && (
                <div className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Objekt: {ticket.object_name}</span>
                </div>
              )}
              {ticket.assigned_to_first_name && ticket.assigned_to_last_name && (
                <div className="flex items-center">
                  <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Zugewiesen an: {ticket.assigned_to_first_name} {ticket.assigned_to_last_name}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Erstellt am: {format(new Date(ticket.created_at), 'dd.MM.yyyy', { locale: de })}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}