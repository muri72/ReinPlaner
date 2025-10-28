"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  MapPin, 
  Users, 
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SwipeableActions } from "./swipeable-actions";

interface Assignment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: 'completed' | 'in_progress' | 'pending' | 'future';
  service_type?: string;
  object_name?: string;
  employee_name?: string;
  customer_name?: string;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

interface MobileAssignmentCardProps {
  assignment: Assignment;
  onStatusChange?: (assignmentId: string, newStatus: string) => void;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignmentId: string) => void;
  onContact?: (assignment: Assignment) => void;
  onViewDetails?: (assignment: Assignment) => void;
  compact?: boolean;
}

const serviceTypeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-green-500",
  "Glasreinigung": "bg-cyan-500",
  "Grundreinigung": "bg-blue-500",
  "Graffitientfernung": "bg-orange-500",
  "Sonderreinigung": "bg-purple-500",
  "default": "bg-gray-500",
};

const statusColors = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  future: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
};

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
};

export function MobileAssignmentCard({ 
  assignment, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onContact, 
  onViewDetails,
  compact = false 
}: MobileAssignmentCardProps) {
  const getStatusIcon = () => {
    switch (assignment.status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (assignment.status) {
      case 'completed': return 'Erledigt';
      case 'in_progress': return 'Aktiv';
      case 'pending': return 'Ausstehend';
      case 'future': return 'Geplant';
      default: return assignment.status;
    }
  };

  const leftActions = [
    {
      icon: <Play className="h-4 w-4" />,
      label: "Starten",
      action: () => onStatusChange?.(assignment.id, 'in_progress'),
      color: "bg-green-500",
      showOnly: assignment.status === 'pending',
    },
    {
      icon: <Pause className="h-4 w-4" />,
      label: "Pausieren",
      action: () => onStatusChange?.(assignment.id, 'pending'),
      color: "bg-orange-500",
      showOnly: assignment.status === 'in_progress',
    },
    {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Abschließen",
      action: () => onStatusChange?.(assignment.id, 'completed'),
      color: "bg-blue-500",
      showOnly: assignment.status !== 'completed',
    },
  ];

  const rightActions = [
    {
      icon: <MoreHorizontal className="h-4 w-4" />,
      label: "Details",
      action: () => onViewDetails?.(assignment),
      color: "bg-gray-500",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Kontakt",
      action: () => onContact?.(assignment),
      color: "bg-blue-500",
    },
  ];

  if (compact) {
    return (
      <SwipeableActions
        leftActions={leftActions.filter(action => !action.showOnly || action.showOnly)}
        rightActions={rightActions}
        onActionExecuted={(action) => {
          action.action();
        }}
      >
        <div className={cn(
          "bg-card border rounded-lg p-3 transition-all duration-200",
          "hover:shadow-md active:scale-95"
        )}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-grow min-w-0">
              <h4 className="font-semibold text-sm truncate">{assignment.title}</h4>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{assignment.startTime} - {assignment.endTime}</span>
                <span className="flex-shrink-0 ml-2">{assignment.hours}h</span>
              </div>
              {assignment.object_name && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{assignment.object_name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusColors[assignment.status])}
              >
                {getStatusIcon()}
                <span className="ml-1">{getStatusText()}</span>
              </Badge>
              {assignment.service_type && (
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  serviceTypeColors[assignment.service_type] || serviceTypeColors.default
                )} />
              )}
            </div>
          </div>
          
          {assignment.notes && (
            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {assignment.notes}
            </div>
          )}
        </div>
      </SwipeableActions>
    );
  }

  return (
    <SwipeableActions
      leftActions={leftActions.filter(action => !action.showOnly || action.showOnly)}
      rightActions={rightActions}
      onActionExecuted={(action) => {
        action.action();
      }}
    >
      <Card className={cn(
        "glassmorphism-card transition-all duration-200",
        "hover:shadow-lg active:scale-95"
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow min-w-0">
              <h3 className="font-semibold text-base mb-1">{assignment.title}</h3>
              
              {/* Status and Priority */}
              <div className="flex items-center space-x-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-sm", statusColors[assignment.status])}
                >
                  {getStatusIcon()}
                  <span className="ml-1">{getStatusText()}</span>
                </Badge>
                
                {assignment.priority && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-sm", priorityColors[assignment.priority])}
                  >
                    {assignment.priority.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* Time and Location */}
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{assignment.startTime} - {assignment.endTime}</span>
                  <span className="ml-2 font-medium">{assignment.hours}h</span>
                </div>
                
                {assignment.object_name && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{assignment.object_name}</span>
                  </div>
                )}
              </div>

              {/* Service Type */}
              {assignment.service_type && (
                <div className="flex items-center">
                  <div className={cn(
                    "w-4 h-4 rounded-full mr-2",
                    serviceTypeColors[assignment.service_type] || serviceTypeColors.default
                  )} />
                  <span className="text-sm text-muted-foreground">{assignment.service_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(assignment)}
              className="p-2"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </SwipeableActions>
  );
}