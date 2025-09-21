"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";

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
  service_type: string | null;
}

interface AssignmentCardProps {
  assignment: Assignment;
}

const serviceTypeBadgeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  "Glasreinigung": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  "Grundreinigung": "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  "Graffitientfernung": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  "Sonderreinigung": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  "default": "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
};

const serviceTypeDotColors: { [key: string]: string } = {
    "Unterhaltsreinigung": "bg-green-500",
    "Glasreinigung": "bg-yellow-500",
    "Grundreinigung": "bg-blue-500",
    "Graffitientfernung": "bg-orange-500",
    "Sonderreinigung": "bg-purple-500",
    "default": "bg-gray-500",
};

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment__${assignment.id}`,
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

  const badgeColorClass = serviceTypeBadgeColors[assignment.service_type || 'default'] || serviceTypeBadgeColors.default;
  const dotColorClass = serviceTypeDotColors[assignment.service_type || 'default'] || serviceTypeDotColors.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded-md border bg-card text-card-foreground shadow-sm relative cursor-grab active:cursor-grabbing touch-none",
        isDragging && "shadow-lg opacity-75"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", getStatusColor())} />
      <div className="ml-2 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{assignment.startTime || 'N/A'} → {assignment.endTime || 'N/A'}</span>
          <div className="flex items-center gap-1.5">
            {assignment.isTeam && <Users className="h-3 w-3" />}
            {assignment.isRecurring && <Repeat className="h-3 w-3" />}
          </div>
        </div>
        <p className="font-semibold text-sm truncate">{assignment.title}</p>
        {assignment.service_type && (
          <Badge variant="outline" className={cn("text-xs font-normal border-none", badgeColorClass)}>
            <span className={cn("h-2 w-2 rounded-full mr-1.5", dotColorClass)} />
            {assignment.service_type}
          </Badge>
        )}
      </div>
    </div>
  );
}