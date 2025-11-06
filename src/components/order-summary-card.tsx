"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRound, Building, Clock, Wrench, Star, MapPin } from "lucide-react";

interface OrderData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  order_type: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  total_estimated_hours: number | null;
}

interface OrderSummaryCardProps {
  order: OrderData;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': default: return 'secondary';
    }
  };

  const employeeNames = (order.employee_first_names && order.employee_last_names)
    ? order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')
    : null;

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Auftragübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {order.customer_name && (
          <div className="flex items-center">
            <Building className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Kunde:</span>
            <span>{order.customer_name}</span>
          </div>
        )}

        {order.object_name && (
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Objekt:</span>
            <span>{order.object_name}</span>
          </div>
        )}

        {order.customer_contact_first_name && order.customer_contact_last_name && (
          <div className="flex items-center">
            <UserRound className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Ansprechpartner:</span>
            <span>{order.customer_contact_first_name} {order.customer_contact_last_name}</span>
          </div>
        )}

        {employeeNames && (
          <div className="flex items-center">
            <UserRound className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Mitarbeiter:</span>
            <span>{employeeNames}</span>
          </div>
        )}

        {order.service_type && (
          <div className="flex items-center">
            <Wrench className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Dienstleistung:</span>
            <span>{order.service_type}</span>
          </div>
        )}

        <div className="flex items-center">
          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
          <Badge variant={getPriorityBadgeVariant(order.priority)} className="ml-2">{order.priority}</Badge>
        </div>

        {order.total_estimated_hours && (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Geschätzte Stunden:</span>
            <span>{order.total_estimated_hours.toFixed(2)}h</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
