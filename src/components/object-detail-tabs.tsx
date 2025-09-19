"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Separator } from "@/components/ui/separator";
import { ObjectOrdersList } from "./object-orders-list";
import { ObjectScheduleView } from "./object-schedule-view";

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

interface ObjectData {
  id: string;
  name: string;
  address: string;
  description: string | null;
  customer_id: string;
  customer_contact_id: string | null;
  notes: string | null;
  priority: string;
  time_of_day: string;
  access_method: string;
  pin: string | null;
  is_alarm_secured: boolean;
  alarm_password: string | null;
  security_code_word: string | null;
  daily_schedules: any[];
  recurrence_interval_weeks: number;
  start_week_offset: number;
  orders: Order[];
}

interface ObjectDetailTabsProps {
  object: ObjectData;
}

export function ObjectDetailTabs({ object }: ObjectDetailTabsProps) {
  const [documentUpdateKey, setDocumentUpdateKey] = useState(0);

  return (
    <Tabs defaultValue="stammdaten" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="auftraege">Aufträge</TabsTrigger>
        <TabsTrigger value="wochenplan">Wochenplan</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
      </TabsList>
      <TabsContent value="stammdaten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Allgemeine und sicherheitsrelevante Informationen.</CardDescription>
            </div>
            <ObjectEditDialog object={object} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Beschreibung</p>
                <p className="whitespace-pre-wrap">{object.description || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Bevorzugte Tageszeit</p>
                <p>{object.time_of_day}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">PIN / Code</p>
                <p>{object.pin || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Alarmkennwort</p>
                <p>{object.alarm_password || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Sicherheitscodewort</p>
                <p>{object.security_code_word || 'N/A'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Interne Notizen</p>
                <p className="whitespace-pre-wrap">{object.notes || 'Keine Notizen vorhanden.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="auftraege">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Zugehörige Aufträge</CardTitle>
            <CardDescription>Alle Aufträge, die diesem Objekt zugeordnet sind.</CardDescription>
          </CardHeader>
          <CardContent>
            <ObjectOrdersList orders={object.orders || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="wochenplan">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Wochenplan</CardTitle>
            <CardDescription>Regelmäßige Arbeitszeiten für dieses Objekt.</CardDescription>
          </CardHeader>
          <CardContent>
            <ObjectScheduleView object={object} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="dokumente">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Verwalten Sie Dokumente, die mit diesem Objekt verknüpft sind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader 
              associatedOrderId={object.id} 
              onDocumentUploaded={() => setDocumentUpdateKey(prev => prev + 1)} 
            />
            <Separator />
            <DocumentList 
              key={documentUpdateKey} 
              associatedOrderId={object.id} 
              onDocumentChange={() => setDocumentUpdateKey(prev => prev + 1)}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}