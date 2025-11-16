"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRound, Building, Clock, Wrench, Star, MapPin } from "lucide-react";
import { OrderHoursSummary } from "@/components/order-hours-summary";

interface OrderData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  object_address: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  order_type: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  total_estimated_hours: number | null;
  fixed_monthly_price: number | null;
  hourly_rate: number | null;
  // For better hour display
  object?: { recurrence_interval_weeks: number } | null;
  assignedEmployees?: Array<{
    employeeId: string;
    assigned_daily_schedules: any[];
  }>;
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

  // Calculate hours per employee from assigned_daily_schedules
  const calculateEmployeeHours = () => {
    if (!order.assignedEmployees || order.assignedEmployees.length === 0) {
      return [];
    }

    return order.assignedEmployees.map((assignment, index) => {
      const firstName = order.employee_first_names?.[index] || "";
      const lastName = order.employee_last_names?.[index] || "";

      // Calculate total hours for this employee across all weeks
      let totalHours = 0;
      if (assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0) {
        assignment.assigned_daily_schedules.forEach((weekSchedule: any) => {
          if (weekSchedule) {
            // Sum up hours for all days in this week
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
              const dayHours = weekSchedule[day]?.hours;
              if (typeof dayHours === 'number' && dayHours > 0) {
                totalHours += dayHours;
              }
            });
          }
        });
      }

      return {
        first_name: firstName,
        last_name: lastName,
        hours_per_week: totalHours,
      };
    });
  };

  const employeeHoursList = calculateEmployeeHours();

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

        {order.object_address && (
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Adresse:</span>
            <span>{order.object_address}</span>
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
          <OrderHoursSummary
            totalHours={order.total_estimated_hours}
            employees={employeeHoursList}
            orderType={order.order_type}
            recurrenceIntervalWeeks={order.object?.recurrence_interval_weeks || 1}
            className="mt-2"
          />
        )}

        {(() => {
          // For recurring, substitution, and permanent orders with flat rate, show only monthly cost
          if (['recurring', 'substitution', 'permanent'].includes(order.order_type) && order.fixed_monthly_price && order.fixed_monthly_price > 0) {
            return (
              <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monatliche Kosten:</span>
                  <span className="text-sm font-semibold text-green-600">{order.fixed_monthly_price.toFixed(2)} €</span>
                </div>
              </div>
            );
          }

          // For one-time orders with flat rate
          if (order.fixed_monthly_price && order.fixed_monthly_price > 0) {
            return (
              <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pauschale:</span>
                  <span className="text-sm font-semibold">{order.fixed_monthly_price.toFixed(2)} €</span>
                </div>
              </div>
            );
          }

          // For hourly rates
          if (order.total_estimated_hours && order.total_estimated_hours > 0 && order.service_type) {
            return (
              <div className="mt-2 p-2 bg-blue-5 rounded-md border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Zeitaufwand:</span>
                  <span className="text-sm font-semibold">
                    {order.total_estimated_hours.toFixed(2)} Std.
                    {order.hourly_rate && (
                      <span className="text-xs text-muted-foreground ml-2">
                        × {order.hourly_rate.toFixed(2)} €/h = {(order.total_estimated_hours * order.hourly_rate).toFixed(2)} €
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Monthly cost for recurring, substitution, and permanent orders with hourly rate */}
        {['recurring', 'substitution', 'permanent'].includes(order.order_type) && order.total_estimated_hours && order.total_estimated_hours > 0 && order.hourly_rate && (
          <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Monatliche Hochrechnung:</span>
              <span className="text-sm font-semibold text-green-600">
                {(order.total_estimated_hours * order.hourly_rate * (4.33 / (order.object?.recurrence_interval_weeks || 1))).toFixed(2)} €
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {order.total_estimated_hours.toFixed(2)}h × {order.hourly_rate.toFixed(2)} €/h × {(4.33 / (order.object?.recurrence_interval_weeks || 1)).toFixed(2)}x
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
