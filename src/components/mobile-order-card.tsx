"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  MoreHorizontal,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SwipeableActions } from "./swipeable-actions";

interface Order {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  order_type: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  employee_names: string[] | null;
  notes: string | null;
}

interface MobileOrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onEdit?: (order: Order) => void;
  onContact?: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

export function MobileOrderCard({ 
  order, 
  onStatusChange, 
  onEdit, 
  onContact, 
  onViewDetails 
}: MobileOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (order.status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
  };

  const leftActions = [
    {
      icon: <Phone className="h-4 w-4" />,
      label: "Kontakt",
      action: () => onContact?.(order),
      color: "bg-blue-500",
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Nachricht",
      action: () => {
        // Open messaging functionality - removed customer_phone reference
        console.log('Open messaging for order:', order.id);
      },
      color: "bg-green-500",
    },
  ];

  const rightActions = [
    {
      icon: <MoreHorizontal className="h-4 w-4" />,
      label: "Details",
      action: () => onViewDetails?.(order),
      color: "bg-gray-500",
    },
  ];

  return (
    <SwipeableActions
      leftActions={leftActions}
      rightActions={rightActions}
      onActionExecuted={(action) => {
        // Handle action feedback
        console.log(`Action executed: ${action.label}`);
      }}
    >
      <Card className={cn(
        "glassmorphism-card transition-all duration-200",
        "hover:shadow-lg active:scale-95"
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow">
              <h3 className="font-semibold text-base mb-1 line-clamp-2">
                {order.title}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {order.customer_name && (
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{order.customer_name}</span>
                  </div>
                )}
                {order.object_name && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{order.object_name}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex items-center space-x-2 mb-3">
            <Badge variant="outline" className={cn(statusColors[order.status as keyof typeof statusColors])}>
              <div className="flex items-center">
                {getStatusIcon()}
                <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
              </div>
            </Badge>
            <Badge variant="outline" className={cn(priorityColors[order.priority as keyof typeof priorityColors])}>
              {order.priority}
            </Badge>
          </div>

          {/* Date Information */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {order.due_date ? formatDate(order.due_date) : formatDate(order.recurring_start_date)}
              </span>
            </div>
            {order.recurring_end_date && (
              <span>bis {formatDate(order.recurring_end_date)}</span>
            )}
          </div>

          {/* Service Type */}
          {order.service_type && (
            <div className="mb-3">
              <Badge variant="secondary" className="text-xs">
                {order.service_type}
              </Badge>
            </div>
          )}

          {/* Assigned Employees */}
          {order.employee_names && order.employee_names.length > 0 && (
            <div className="mb-3">
              <div className="text-sm text-muted-foreground mb-1">Zugewiesen:</div>
              <div className="flex flex-wrap gap-1">
                {order.employee_names.slice(0, 3).map((name, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {order.employee_names.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{order.employee_names.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Expandable Notes */}
          {order.notes && (
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded ? "max-h-40" : "max-h-0"
            )}>
              <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <div className="font-medium mb-1">Notizen:</div>
                <p className="line-clamp-3">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(order)}
              className="flex-grow"
            >
              Details
            </Button>
            {order.status === 'pending' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onStatusChange?.(order.id, 'in_progress')}
              >
                Starten
              </Button>
            )}
            {order.status === 'in_progress' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onStatusChange?.(order.id, 'completed')}
              >
                Abschließen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </SwipeableActions>
  );
}