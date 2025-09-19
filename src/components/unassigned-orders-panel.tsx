"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { UnassignedOrder } from "@/app/dashboard/planning/actions";

function DraggableOrder({ order }: { order: UnassignedOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100, // Ensure it's on top while dragging
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-2 p-2 cursor-grab touch-none",
        isDragging ? "shadow-lg opacity-75" : "shadow-sm"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center">
          <div {...listeners} {...attributes} className="p-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-sm">{order.title}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{order.service_type || 'Allgemein'}</span>
              <span>{order.total_estimated_hours ? `${Number(order.total_estimated_hours).toFixed(2)}h` : ''}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UnassignedOrdersPanelProps {
  unassignedOrders: UnassignedOrder[];
  isLoading: boolean;
}

export function UnassignedOrdersPanel({ unassignedOrders, isLoading }: UnassignedOrdersPanelProps) {
  return (
    <Card className="h-full flex flex-col shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ungeplante Aufträge</CardTitle>
        <CardDescription className="text-sm">Ziehen Sie Aufträge auf den Kalender.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : unassignedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Keine ungeplanten Aufträge.
          </p>
        ) : (
          unassignedOrders.map((order) => (
            <DraggableOrder key={order.id} order={order} />
          ))
        )}
      </CardContent>
    </Card>
  );
}