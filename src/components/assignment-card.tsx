"use client";

import * as React from "react";
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
  service_type: string | null;
}

interface AssignmentCardProps {
  assignment: Assignment;
}

const serviceTypeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200",
  "Glasreinigung": "bg-cyan-100 border-cyan-500 text-cyan-800 dark:bg-cyan-900/50 dark:border-cyan-700 dark:text-cyan-200",
  "Grundreinigung": "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200",
  "Graffitientfernung": "bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200",
  "Sonderreinigung": "bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900/50 dark:border-purple-700 dark:text-purple-200",
  "default": "bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-200",
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

  const serviceColorClass = serviceTypeColors[assignment.service_type || 'default'] || serviceTypeColors.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-1 rounded-md border bg-card text-card-foreground shadow-sm relative touch-none",
        isDragging && "shadow-lg opacity-75",
        serviceColorClass
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", getStatusColor())} />
      <div className="ml-2 flex items-center">
        <div {...listeners} {...attributes} className="p-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-medium text-xs truncate">{assignment.title}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
            <div className="flex items-center gap-1 truncate">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{assignment.startTime || 'N/A'} - {assignment.endTime || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {assignment.isRecurring && <Repeat className="h-3 w-3" />}
              {assignment.isTeam && <Users className="h-3 w-3" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}