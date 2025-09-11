"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound, Building } from "lucide-react";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { FileStack } from "lucide-react";

interface DisplayObject {
  id: string;
  user_id: string | null;
  customer_id: string;
  name: string;
  address: string;
  description: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_contact_id: string | null;
  object_leader_first_name: string | null;
  object_leader_last_name: string | null;
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
}

interface ObjectsGridViewProps {
  objects: DisplayObject[];
  query: string;
  customerIdFilter: string;
  priorityFilter: string;
  timeOfDayFilter: string;
  accessMethodFilter: string;
  onActionSuccess: () => void;
}

export function ObjectsGridView({
  objects,
  query,
  customerIdFilter,
  priorityFilter,
  timeOfDayFilter,
  accessMethodFilter,
  onActionSuccess,
}: ObjectsGridViewProps) {

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const germanDayNames: { [key: string]: string } = {
    monday: 'Mo',
    tuesday: 'Di',
    wednesday: 'Mi',
    thursday: 'Do',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'So',
  };

  if (objects.length === 0 && !query && !customerIdFilter && !priorityFilter && !timeOfDayFilter && !accessMethodFilter) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Objekte vorhanden</p>
        <p className="text-sm">Fügen Sie ein neues Objekt hinzu, um es zu verwalten.</p>
        <div className="mt-4">
          <ObjectCreateDialog onObjectCreated={onActionSuccess} />
        </div>
      </div>
    );
  }

  if (objects.length === 0 && (query || customerIdFilter || priorityFilter || timeOfDayFilter || accessMethodFilter)) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Objekte gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {objects.map((object) => (
        <Card key={object.id} className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base md:text-lg font-semibold">{object.name}</CardTitle>
            <div className="flex items-center space-x-2">
              <RecordDetailsDialog record={object} title={`Details zu Objekt: ${object.name}`} />
              <ObjectEditDialog object={object} />
              <DeleteObjectButton objectId={object.id} onDeleteSuccess={onActionSuccess} />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
            {object.customer_name && (
              <p className="text-sm text-muted-foreground">
                Kunde: {object.customer_name}
              </p>
            )}
            {object.object_leader_first_name && object.object_leader_last_name && (
              <div className="flex items-center text-sm text-muted-foreground">
                <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Objektleiter: {object.object_leader_first_name} {object.object_leader_last_name}</span>
              </div>
            )}
            {object.address && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{object.address}</span>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Priorität: <Badge variant={getPriorityBadgeVariant(object.priority)}>{object.priority}</Badge></span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Key className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Zugang: <Badge variant="secondary">{object.access_method}</Badge></span>
            </div>
            {object.is_alarm_secured && (
              <div className="flex items-center text-sm text-muted-foreground">
                <ShieldCheck className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Alarmgesichert</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}