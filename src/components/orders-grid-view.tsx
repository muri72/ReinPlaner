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
  fixed_monthly_price: number | null;
  hourly_rate: number | null;
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
                <>
                  <div className="flex items-center">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {order.employee_first_names.map((f, i) => `${f} ${order.employee_last_names?.[i] || ''}`).join(', ')}
                    </span>
                  </div>
                  {/* Employee Schedule Display */}
                  {order.assignedEmployees && order.assignedEmployees.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Zeitplan
                      </p>
                      <div className="space-y-2">
                        {order.assignedEmployees.map((emp, empIndex) => {
                          if (!emp.assigned_daily_schedules || emp.assigned_daily_schedules.length === 0) {
                            return null;
                          }
                          const firstSchedule = emp.assigned_daily_schedules[0] || {};
                          const dayNames: { [key: string]: string } = {
                            monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do',
                            friday: 'Fr', saturday: 'Sa', sunday: 'So'
                          };
                          const activeDays = Object.keys(firstSchedule).filter(day =>
                            day !== 'total_hours' && firstSchedule[day]?.hours > 0
                          );

                          if (activeDays.length === 0) return null;

                          const employeeName = order.employee_first_names?.[empIndex] && order.employee_last_names?.[empIndex]
                            ? `${order.employee_first_names[empIndex]} ${order.employee_last_names[empIndex]}`
                            : `Mitarbeiter ${empIndex + 1}`;

                          return (
                            <div key={empIndex} className="w-full">
                              <p className="text-xs font-medium text-foreground mb-1">
                                {employeeName}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {activeDays.map(day => {
                                  const hours = firstSchedule[day]?.hours || 0;
                                  return (
                                    <div key={day} className="flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                                      <span className="text-xs font-medium">{dayNames[day]}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {hours.toFixed(1)}h
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
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

              {(() => {
                // For recurring, substitution, and permanent orders with flat rate, show only monthly cost
                if (['recurring', 'substitution', 'permanent'].includes(order.order_type) && order.fixed_monthly_price && order.fixed_monthly_price > 0) {
                  return (
                    <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Monatliche Kosten:</span>
                        <span className="text-sm font-semibold text-green-600">{order.fixed_monthly_price.toFixed(2)} €</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">pro Monat</p>
                    </div>
                  );
                }

                // For one-time orders with flat rate
                if (order.fixed_monthly_price && order.fixed_monthly_price > 0) {
                  return (
                    <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Pauschale:</span>
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
                        <span className="text-xs font-medium text-muted-foreground">Zeitaufwand:</span>
                        <span className="text-sm font-semibold">
                          {order.total_estimated_hours.toFixed(2)} Std.
                          {order.hourly_rate && (
                            <span className="text-xs text-muted-foreground ml-2">
                              × {order.hourly_rate.toFixed(2)} €/h
                            </span>
                          )}
                        </span>
                      </div>
                      {order.hourly_rate && (
                        <div className="mt-1 text-right">
                          <span className="text-xs font-medium">Gesamt: {(order.total_estimated_hours * order.hourly_rate).toFixed(2)} €</span>
                        </div>
                      )}

                      {/* Monthly Extrapolation for hourly rates - only for recurring, substitution, and permanent */}
                      {['recurring', 'substitution', 'permanent'].includes(order.order_type) && (() => {
                        if (order.hourly_rate && order.total_estimated_hours > 0 && order.service_type) {
                          const weeksPerMonth = 4.33; // Average weeks per month
                          const recurrenceInterval = order.object?.recurrence_interval_weeks || 1;
                          const occurrencesPerMonth = weeksPerMonth / recurrenceInterval;
                          const monthlyTotal = order.total_estimated_hours * order.hourly_rate * occurrencesPerMonth;

                          return (
                            <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                              <p className="text-xs text-muted-foreground">
                                {occurrencesPerMonth.toFixed(2)}x pro Monat
                                {recurrenceInterval > 1 && ` (alle ${recurrenceInterval} Wochen)`}
                              </p>
                              <p className="text-sm font-bold text-green-600">
                                {monthlyTotal.toFixed(2)} €
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                }

                return null;
              })()}

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
