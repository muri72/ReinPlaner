"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment__${assignment.id}`, // Prefix to distinguish from unassigned orders
    data: { assignment },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined;

  const getStatusColor = () => {
    switch (assignment.status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-red-500';
      case 'future':
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-1.5 rounded-md border bg-card text-card-foreground shadow-sm relative touch-none",
        isDragging && "shadow-lg opacity-75"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", getStatusColor())} />
      <div className="ml-2 flex items-center">
        <div {...listeners} {...attributes} className="p-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-grow">
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
    </div>
  );
}