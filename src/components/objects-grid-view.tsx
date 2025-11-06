"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import Link from "next/link";

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
        <Link key={object.id} href={`/dashboard/objects/${object.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold line-clamp-2">{object.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
              {object.customer_name && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Kunde:</span> {object.customer_name}
                </p>
              )}
              {object.address && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Adresse:</span> {object.address}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={getPriorityBadgeVariant(object.priority)}>{object.priority}</Badge>
                <Badge variant="secondary">{object.access_method}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}