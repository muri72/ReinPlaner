"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { Button } from "./ui/button";

interface Order {
  id: string;
  title: string;
  status: string;
  order_type: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  objects: { name: string | null } | null;
}

interface CustomerOrdersListProps {
  orders: Order[];
}

export function CustomerOrdersList({ orders }: CustomerOrdersListProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': default: return 'outline';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Keine Aufträge für diesen Kunden gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Objekt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Zeitraum</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.title}</TableCell>
              <TableCell>{order.objects?.name || 'N/A'}</TableCell>
              <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
              <TableCell><Badge variant="outline">{order.order_type}</Badge></TableCell>
              <TableCell>
                {order.order_type === "one_time" && order.due_date && (
                  <div className="flex items-center text-sm">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {format(new Date(order.due_date), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}
                {(order.order_type === "recurring" || order.order_type === "permanent" || order.order_type === "substitution") && order.recurring_start_date && (
                  <div className="flex items-center text-sm">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                    {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/orders?query=${order.title}`}>
                    Zum Auftrag
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