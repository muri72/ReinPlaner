"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { UnassignedOrder } from "@/app/dashboard/planning/actions";

interface DraggableOrderCardProps {
  order: UnassignedOrder;
}

export function DraggableOrderCard({ order }: DraggableOrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unassigned__${order.id}`, // Prefix to identify as unassigned
    data: { order },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-1.5 rounded-md border bg-blue-500/10 border-blue-500/30 text-card-foreground shadow-sm cursor-grab touch-none",
        isDragging && "shadow-lg opacity-75"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center">
          <div {...listeners} {...attributes} className="p-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-xs truncate">{order.title}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
              <span>{order.service_type || 'Allgemein'}</span>
              <span>{order.total_estimated_hours ? `${Number(order.total_estimated_hours).toFixed(2)}h` : ''}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}