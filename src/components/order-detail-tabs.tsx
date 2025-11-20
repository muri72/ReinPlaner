"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Separator } from "@/components/ui/separator";
import { OrderHoursSummary } from "@/components/order-hours-summary";
import { Calendar, Clock, User } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";

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
  notes: string | null;
  order_type: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  total_estimated_hours: number | null;
  fixed_monthly_price: number | null;
  hourly_rate: number | null;
  request_status: string;
  customer_id: string | null;
  object_id: string | null;
  customer_contact_id: string | null;
  is_active: boolean;
  end_date: string | null;
  // Employee data
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  // Object data for recurrence
  object?: { recurrence_interval_weeks: number } | null;
  // Employee assignments
  assignedEmployees: Array<{
    employeeId: string;
    assigned_daily_schedules: any[];
    assigned_recurrence_interval_weeks: number;
    assigned_start_week_offset: number;
  }>;
}

interface OrderDetailTabsProps {
  order: OrderData;
}

export function OrderDetailTabs({ order }: OrderDetailTabsProps) {
  const [documentUpdateKey, setDocumentUpdateKey] = useState(0);

  return (
    <Tabs defaultValue="stammdaten" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
        <TabsTrigger value="zeitplanung">Zeitplanung</TabsTrigger>
      </TabsList>
      <TabsContent value="stammdaten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Allgemeine Informationen zum Auftrag.</CardDescription>
            </div>
            <div className="flex space-x-2">
              <OrderEditDialog order={order} />
              <DeleteOrderButton orderId={order.id} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Beschreibung</p>
                <p className="whitespace-pre-wrap">{order.description || 'Keine Beschreibung vorhanden'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Status</p>
                <p>{order.status}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Priorität</p>
                <p>{order.priority}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Dienstleistung</p>
                <p>{order.service_type || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Typ</p>
                <p>{order.order_type}</p>
              </div>
              {order.due_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Fällig am</p>
                  <p>{parseLocalDate(order.due_date)?.toLocaleDateString()}</p>
                </div>
              )}
              {order.recurring_start_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Startdatum</p>
                  <p>{parseLocalDate(order.recurring_start_date)?.toLocaleDateString()}</p>
                </div>
              )}
              {order.recurring_end_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Enddatum (Wiederkehrend)</p>
                  <p>{parseLocalDate(order.recurring_end_date)?.toLocaleDateString()}</p>
                </div>
              )}
              {order.end_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Auftrag Enddatum</p>
                  <p>{parseLocalDate(order.end_date)?.toLocaleDateString()}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Status</p>
                <p className={order.is_active ? "text-green-600 font-medium" : "text-gray-500"}>
                  {order.is_active ? "Aktiv" : "Inaktiv"}
                </p>
              </div>
              {order.total_estimated_hours && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Stunden</p>
                  <OrderHoursSummary
                    totalHours={order.total_estimated_hours}
                    employees={
                      order.employee_first_names && order.employee_last_names
                        ? order.employee_first_names.map((first, i) => ({
                            first_name: first,
                            last_name: order.employee_last_names?.[i] || "",
                            hours_per_week: 0,
                          }))
                        : []
                    }
                    orderType={order.order_type}
                    recurrenceIntervalWeeks={order.object?.recurrence_interval_weeks || 1}
                    assignedEmployees={order.assignedEmployees}
                  />
                </div>
              )}
              {/* Price Display */}
              {(() => {
                // For recurring, substitution, and permanent orders with flat rate, show only monthly cost
                if (['recurring', 'substitution', 'permanent'].includes(order.order_type) && order.fixed_monthly_price && order.fixed_monthly_price > 0) {
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">Monatliche Kosten</p>
                      <p className="text-2xl font-bold text-green-600">{order.fixed_monthly_price.toFixed(2)} €</p>
                      <p className="text-sm text-muted-foreground">pro Monat</p>
                    </div>
                  );
                }

                // For one-time orders with flat rate, or hourly rates
                if (order.fixed_monthly_price && order.fixed_monthly_price > 0) {
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">Pauschale</p>
                      <p className="text-2xl font-bold text-primary">{order.fixed_monthly_price.toFixed(2)} €</p>
                      <p className="text-sm text-muted-foreground">pro Auftrag</p>
                    </div>
                  );
                } else if (order.total_estimated_hours && order.total_estimated_hours > 0 && order.service_type) {
                  return (
                    <div className="space-y-2">
                      <p className="font-medium text-muted-foreground">Zeitaufwand</p>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-lg font-semibold">
                          {order.total_estimated_hours.toFixed(2)} Std. {order.hourly_rate ? `× ${order.hourly_rate.toFixed(2)} €/h` : ''}
                        </p>
                        {order.hourly_rate && (
                          <p className="text-xl font-bold text-primary">
                            = {(order.total_estimated_hours * order.hourly_rate).toFixed(2)} € pro Einsatz
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }

                // Monthly cost for hourly rates on recurring orders
                if (['recurring', 'substitution', 'permanent'].includes(order.order_type) && order.total_estimated_hours && order.total_estimated_hours > 0 && order.hourly_rate) {
                  const weeksPerMonth = 4.33; // Average weeks per month
                  const recurrenceInterval = order.object?.recurrence_interval_weeks || 1;
                  const occurrencesPerMonth = weeksPerMonth / recurrenceInterval;
                  const monthlyTotal = order.total_estimated_hours * order.hourly_rate * occurrencesPerMonth;

                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">Monatliche Hochrechnung</p>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-muted-foreground">
                          {occurrencesPerMonth.toFixed(2)}x pro Monat
                          {recurrenceInterval > 1 && ` (alle ${recurrenceInterval} Wochen)`}
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {monthlyTotal.toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.total_estimated_hours.toFixed(2)}h × {order.hourly_rate.toFixed(2)} €/h × {occurrencesPerMonth.toFixed(2)}x
                        </p>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Notizen</p>
                <p className="whitespace-pre-wrap">{order.notes || 'Keine Notizen vorhanden.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="dokumente">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Verwalten Sie Dokumente, die mit diesem Auftrag verknüpft sind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader
              associatedOrderId={order.id}
              onDocumentUploaded={() => setDocumentUpdateKey(prev => prev + 1)}
            />
            <Separator />
            <DocumentList
              key={documentUpdateKey}
              associatedOrderId={order.id}
              onDocumentChange={() => setDocumentUpdateKey(prev => prev + 1)}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="zeitplanung">
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          {order.assignedEmployees.length > 0 ? (
            <div className="space-y-4">
              {order.assignedEmployees.map((assignment, index) => (
              <Card key={index} className="shadow-neumorphic glassmorphism-card border-l-4 border-l-primary/50">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {order.employee_first_names?.[index] && order.employee_last_names?.[index]
                          ? `${order.employee_first_names[index]} ${order.employee_last_names[index]}`
                          : `Mitarbeiter ${index + 1}`}
                      </CardTitle>
                      <CardDescription>
                        {order.object?.recurrence_interval_weeks === 1
                          ? "Wöchentliche Reinigung"
                          : `Reinigung alle ${order.object?.recurrence_interval_weeks || 1} Wochen`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Wiederholung</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {order.object?.recurrence_interval_weeks === 1
                          ? "Jede Woche"
                          : `Alle ${order.object?.recurrence_interval_weeks || 1} Wochen`}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Start</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {(() => {
                          const weekNum = assignment.assigned_start_week_offset + 1;
                          return weekNum === 1
                            ? "Erste Woche"
                            : weekNum === 2
                              ? "Zweite Woche"
                              : weekNum === 3
                                ? "Dritte Woche"
                                : weekNum === 4
                                  ? "Vierte Woche"
                                  : `Woche ${weekNum}`;
                        })()}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Zyklus</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {order.object?.recurrence_interval_weeks || 1} {order.object?.recurrence_interval_weeks === 1 ? 'Woche' : 'Wochen'}
                      </p>
                    </div>
                  </div>

                  {assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Wöchentliche Arbeitszeiten
                      </h4>
                      {assignment.assigned_daily_schedules.map((weekSchedule: any, weekIndex: number) => (
                        <Card key={weekIndex} className="border border-border/50">
                          <CardHeader className="py-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              {order.order_type !== 'one_time'
                                ? `Woche ${weekIndex + 1} von ${order.object?.recurrence_interval_weeks || 1}`
                                : 'Einmaliger Termin'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {/* Fixed order: Monday to Sunday */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                const schedule = weekSchedule[day];
                                const dayNames: { [key: string]: { short: string; full: string; icon: string } } = {
                                  monday: { short: 'Mo', full: 'Montag', icon: 'M' },
                                  tuesday: { short: 'Di', full: 'Dienstag', icon: 'D' },
                                  wednesday: { short: 'Mi', full: 'Mittwoch', icon: 'M' },
                                  thursday: { short: 'Do', full: 'Donnerstag', icon: 'D' },
                                  friday: { short: 'Fr', full: 'Freitag', icon: 'F' },
                                  saturday: { short: 'Sa', full: 'Samstag', icon: 'S' },
                                  sunday: { short: 'So', full: 'Sonntag', icon: 'S' },
                                };
                                const dayInfo = dayNames[day];

                                if (!schedule || !schedule.hours) return null;

                                return (
                                  <div key={day} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
                                    <div className="mb-2">
                                      <span className="text-sm font-semibold">{dayInfo.short}</span>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">Stunden</p>
                                      <p className="text-sm font-bold">{schedule.hours?.toFixed(2) || 0}h</p>
                                      {schedule.start && (
                                        <>
                                          <p className="text-xs text-muted-foreground mt-2">Start</p>
                                          <p className="text-sm">{schedule.start}</p>
                                        </>
                                      )}
                                      {schedule.end && (
                                        <>
                                          <p className="text-xs text-muted-foreground mt-2">Ende</p>
                                          <p className="text-sm">{schedule.end}</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-neumorphic glassmorphism-card">
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Keine Mitarbeiter für diesen Auftrag zugewiesen.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
