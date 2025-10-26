"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { AssignmentEditDialog } from "./assignment-edit-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface Assignment {
  id: string;
  orderId: string; // Order ID
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
  onSuccess: () => void; // Add onSuccess callback
}

const serviceTypeBadgeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  "Glasreinigung": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  "Grundreinigung": "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  "Graffitientfernung": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  "Sonderreinigung": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  "default": "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
};

const serviceTypeDotColors: { [key: string]: string } = {
    "Unterhaltsreinigung": "bg-green-500",
    "Glasreinigung": "bg-cyan-500",
    "Grundreinigung": "bg-blue-500",
    "Graffitientfernung": "bg-orange-500",
    "Sonderreinigung": "bg-purple-500",
    "default": "bg-gray-500",
};

export function AssignmentCard({ assignment, onSuccess }: AssignmentCardProps) {
  const isMobile = useIsMobile();
  
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
      case 'completed': return 'border-green-500';
      case 'pending': return 'border-red-500';
      case 'future':
      default: return 'border-blue-500';
    }
  };

  const badgeColorClass = serviceTypeBadgeColors[assignment.service_type || 'default'] || serviceTypeBadgeColors.default;
  const dotColorClass = serviceTypeDotColors[assignment.service_type || 'default'] || serviceTypeDotColors.default;

  return (
    <AssignmentEditDialog orderId={assignment.orderId} onSuccess={onSuccess}>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          "p-2 rounded-md border-l-4 bg-card text-card-foreground shadow-sm cursor-grab active:cursor-grabbing touch-none space-y-1",
          getStatusColor(),
          isDragging && "shadow-lg opacity-75",
          isMobile ? "text-xs" : "text-sm"
        )}
      >
        {isMobile ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate flex-1">{assignment.title}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {assignment.isTeam && <Users className="h-3 w-3" />}
                {assignment.isRecurring && <Repeat className="h-3 w-3" />}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                <span>{assignment.hours.toFixed(1)}h</span>
              </div>
              {assignment.service_type && (
                <Badge variant="outline" className={cn("text-xs font-normal border-none", badgeColorClass)}>
                  <span className={cn("h-2 w-2 rounded-full mr-1", dotColorClass)} />
                </Badge>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{assignment.startTime || 'N/A'} → {assignment.endTime || 'N/A'}</span>
              <div className="flex items-center gap-1.5">
                {assignment.isTeam && <Users className="h-3 w-3" />}
                {assignment.isRecurring && <Repeat className="h-3 w-3" />}
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              <span>{assignment.hours.toFixed(2)}h</span>
            </div>
            <p className="font-bold text-sm truncate">{assignment.title}</p>
            {assignment.service_type && (
              <Badge variant="outline" className={cn("text-xs font-normal border-none w-full justify-start", badgeColorClass)}>
                <span className={cn("h-2 w-2 rounded-full mr-1.5", dotColorClass)} />
                <span className="truncate">{assignment.service_type}</span>
              </Badge>
            )}
          </>
        )}
      </div>
    </AssignmentEditDialog>
  );
}