"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users } from "lucide-react";

interface Assignment {
  id: string;
  orderId: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  hours: number;
  isRecurring: boolean;
  isTeam: boolean;
  status: 'completed' | 'pending' | 'future';
}

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const getStatusColor = () => {
    switch (assignment.status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-red-500';
      case 'future':
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="p-1.5 rounded-md border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-card/80 relative">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", getStatusColor())} />
      <div className="ml-2">
        <p className="font-semibold text-xs truncate">{assignment.title}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{assignment.startTime || 'N/A'} - {assignment.endTime || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {assignment.isRecurring && <Repeat className="h-3 w-3" />}
            {assignment.isTeam && <Users className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}