"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, UserRound, Key, ShieldCheck, Clock, Building } from "lucide-react";

interface ObjectData {
  id: string;
  name: string;
  address: string | null;
  priority: string;
  access_method: string;
  is_alarm_secured: boolean;
  customer_name: string | null;
  object_leader_first_name: string | null;
  object_leader_last_name: string | null;
}

interface ObjectSummaryCardProps {
  object: ObjectData;
}

export function ObjectSummaryCard({ object }: ObjectSummaryCardProps) {
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Objektübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {object.customer_name && (
          <div className="flex items-center">
            <Building className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Kunde:</span>
            <span>{object.customer_name}</span>
          </div>
        )}
        {object.object_leader_first_name && (
          <div className="flex items-center">
            <UserRound className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium mr-2">Objektleiter:</span>
            <span>{object.object_leader_first_name} {object.object_leader_last_name}</span>
          </div>
        )}
        {object.address && (
          <div className="flex items-start">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
            <span>{object.address}</span>
          </div>
        )}
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="font-medium mr-2">Priorität:</span>
          <Badge variant={getPriorityBadgeVariant(object.priority)}>{object.priority}</Badge>
        </div>
        <div className="flex items-center">
          <Key className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="font-medium mr-2">Zugang:</span>
          <Badge variant="secondary">{object.access_method}</Badge>
        </div>
        {object.is_alarm_secured && (
          <div className="flex items-center">
            <ShieldCheck className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">Alarmgesichert</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}