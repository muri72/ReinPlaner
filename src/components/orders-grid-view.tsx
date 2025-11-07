"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, UserRound, Clock } from "lucide-react";
import Link from "next/link";
import { OrderHoursSummary } from "@/components/order-hours-summary";

interface DisplayOrder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  object_address: string | null;
  order_type: string;
  total_estimated_hours: number | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  // For better hour display
  object?: { recurrence_interval_weeks: number } | null;
  assignedEmployees?: Array<{
    employeeId: string;
    assigned_daily_schedules: any[];
  }>;
}

interface OrdersGridViewProps {
  orders: DisplayOrder[];
  employees: { id: string; first_name: string | null; last_name: string | null }[];
  onActionSuccess: () => void;
}

export function OrdersGridView({ orders, employees, onActionSuccess }: OrdersGridViewProps) {
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

  if (orders.length === 0) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {orders.map((order) => (
        <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold line-clamp-2">{order.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
              {order.customer_name && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Kunde:</span> {order.customer_name}
                </p>
              )}
              {order.object_name && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Objekt:</span> {order.object_name}
                </p>
              )}
              {order.object_address && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Adresse:</span> {order.object_address}
                </p>
              )}
              {order.employee_first_names && order.employee_last_names && order.employee_first_names.length > 0 && (
                <div className="flex items-center">
                  <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    {order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')}
                  </span>
                </div>
              )}
              {order.total_estimated_hours && (
                <OrderHoursSummary
                  totalHours={order.total_estimated_hours}
                  employees={
                    order.employee_first_names && order.employee_last_names
                      ? order.employee_first_names.map((first, i) => ({
                          first_name: first,
                          last_name: order.employee_last_names?.[i] || "",
                          hours_per_week: 0, // Will be calculated
                        }))
                      : []
                  }
                  orderType={order.order_type}
                  recurrenceIntervalWeeks={order.object?.recurrence_interval_weeks || 1}
                />
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                <Badge variant={getPriorityBadgeVariant(order.priority)}>{order.priority}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
