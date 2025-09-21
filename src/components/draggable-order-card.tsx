"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { UnassignedOrder } from "@/app/dashboard/planning/actions";

interface DraggableOrderCardProps {
  order: UnassignedOrder;
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

export function DraggableOrderCard({ order }: DraggableOrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unassigned__${order.id}`,
    data: { order },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined;

  const badgeColorClass = serviceTypeBadgeColors[order.service_type || 'default'] || serviceTypeBadgeColors.default;
  const dotColorClass = serviceTypeDotColors[order.service_type || 'default'] || serviceTypeDotColors.default;

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
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{order.total_estimated_hours ? `${Number(order.total_estimated_hours).toFixed(2)}h` : 'N/A'}</span>
        </div>
        <p className="font-semibold text-sm truncate">{order.title}</p>
        {order.service_type && (
          <Badge variant="outline" className={cn("text-xs font-normal border-none", badgeColorClass)}>
            <span className={cn("h-2 w-2 rounded-full mr-1.5", dotColorClass)} />
            {order.service_type}
          </Badge>
        )}
      </div>
    </div>
  );
}