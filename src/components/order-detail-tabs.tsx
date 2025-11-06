"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Separator } from "@/components/ui/separator";

interface OrderData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  notes: string | null;
  order_type: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  total_estimated_hours: number | null;
  request_status: string;
  customer_id: string | null;
  object_id: string | null;
  customer_contact_id: string | null;
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
                  <p>{new Date(order.due_date).toLocaleDateString()}</p>
                </div>
              )}
              {order.recurring_start_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Startdatum</p>
                  <p>{new Date(order.recurring_start_date).toLocaleDateString()}</p>
                </div>
              )}
              {order.recurring_end_date && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Enddatum</p>
                  <p>{new Date(order.recurring_end_date).toLocaleDateString()}</p>
                </div>
              )}
              {order.total_estimated_hours && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Geschätzte Stunden</p>
                  <p>{order.total_estimated_hours.toFixed(2)}h</p>
                </div>
              )}
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
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Zeitplanung</CardTitle>
            <CardDescription>Zeitplanung und Termine für diesen Auftrag.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Zeitplanung wird in Kürze implementiert.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
