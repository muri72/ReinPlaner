"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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
  start_date: string | null;
  end_date: string | null;
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
      <Card
        className={cn(
          "glassmorphism-card transition-all duration-200",
          "hover:shadow-lg active:scale-95"
        )}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                {order.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {order.customer_name && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="truncate">{order.customer_name}</span>
                  </div>
                )}
                {order.object_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{order.object_name}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-12 w-12 rounded-full border border-border/60 bg-card/80 text-muted-foreground shadow-sm transition hover:bg-accent sm:h-10 sm:w-10"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Notizen ausblenden" : "Notizen anzeigen"}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                statusColors[order.status as keyof typeof statusColors]
              )}
            >
              {getStatusIcon()}
              <span className="capitalize">{order.status.replace("_", " ")}</span>
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                priorityColors[order.priority as keyof typeof priorityColors]
              )}
            >
              {order.priority}
            </Badge>
          </div>

          {/* Date Information */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {order.start_date
                  ? formatDate(order.start_date)
                  : order.end_date && formatDate(order.end_date)}
              </span>
            </div>
            {order.end_date && (
              <span className="text-xs text-muted-foreground/80">
                bis {formatDate(order.end_date)}
              </span>
            )}
          </div>

          {/* Service Type */}
          {order.service_type && (
            <div>
              <Badge variant="secondary" className="text-xs">
                {order.service_type}
              </Badge>
            </div>
          )}

          {/* Assigned Employees */}
          {order.employee_names && order.employee_names.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">
                Zugewiesen
              </div>
              <div className="flex flex-wrap gap-2">
                {order.employee_names.slice(0, 3).map((name, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="max-w-[160px] truncate bg-muted/40 px-2 py-1 text-xs font-medium"
                  >
                    {name}
                  </Badge>
                ))}
                {order.employee_names.length > 3 && (
                  <Badge
                    variant="outline"
                    className="bg-muted/40 px-2 py-1 text-xs font-medium"
                  >
                    +{order.employee_names.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Expandable Notes */}
          {order.notes && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "max-h-48" : "max-h-0"
              )}
              aria-hidden={!isExpanded}
            >
              <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground shadow-sm">
                <div className="mb-1 font-medium">Notizen</div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:gap-3">
            <Button
              variant="outline"
              size="mobile-default"
              onClick={() => onViewDetails?.(order)}
              className="flex-1 justify-center gap-2"
            >
              Details
            </Button>
            {order.status === "pending" && (
              <Button
                variant="default"
                size="mobile-default"
                onClick={() => onStatusChange?.(order.id, "in_progress")}
                className="justify-center"
              >
                Starten
              </Button>
            )}
            {order.status === "in_progress" && (
              <Button
                variant="default"
                size="mobile-default"
                onClick={() => onStatusChange?.(order.id, "completed")}
                className="justify-center"
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