"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users, ArrowRightLeft } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AssignmentEditDialog } from "./assignment-edit-dialog"; // Import the new dialog

import { deleteOrder } from "@/app/dashboard/orders/actions"; // Adjust path if needed
import { handleActionResponse } from "@/lib/toast-utils";

interface Assignment {
  id: string; // Assignment ID (from order_employee_assignments)
  orderId: string; // Order ID
  title: string;
  startTime: string | null;
  endTime: string | null;
  hours: number;
  isRecurring: boolean;
  isTeam: boolean;
  isSubstitution?: boolean; // Vertretungseinsatz
  status: 'completed' | 'pending' | 'future';
  service_type: string | null;
  service_color?: string | null; // Optional color for the service
  scheduleDate?: string; // Optional: specific date for this card instance if known
}

interface AssignmentCardProps {
  assignment: Assignment;
  onSuccess: () => void;
  date?: string; // Date context for this card
  services?: any[]; // Services for the assignment
}



export function AssignmentCard({ assignment, onSuccess, date, services = [] }: AssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment__${assignment.id}`, // Note: assignment.id might need to be unique per day if same assignment ID is used? 
    // In actions.ts, assignment.id is the remote ID. If recurring, same ID appears multiple times? 
    // Usually dnd-kit needs unique IDs. The PlanningCalendar presumably appends date to ID or handles it?
    // Let's assume passed assignment.id is unique or correct for now.
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

  // Dynamic Service Colors
  const currentService = services.find(s => s.name === assignment.service_type || s.key === assignment.service_type);
  const serviceColor = currentService?.color || assignment.service_color || "#6b7280"; // Default gray

  // Helper to determine if a color is light or dark to adjust text color
  const isLightColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) * (g * 587) + (b * 114)) / 1000;
    return brightness > 155;
  };

  // We'll apply the background color via style prop, so we just need text color class
  const badgeTextColorClass = isLightColor(serviceColor) ? "text-gray-800" : "text-white";

  const handleDeleteOrder = async () => {
    const formData = new FormData();
    formData.append("orderId", assignment.orderId);
    const result = await deleteOrder(formData);
    handleActionResponse(result);
    if (result.success) onSuccess();
  };

  const handleCancelRequest = () => {
    // Confirm standard deletion
    if (confirm("Möchten Sie diesen Auftrag wirklich löschen?")) {
      handleDeleteOrder();
    }
  };

  return (
    <>
      <AssignmentEditDialog
        orderId={assignment.orderId}
        onSuccess={onSuccess}
      >
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "p-2 rounded-md border-l-4 bg-card text-card-foreground shadow-sm cursor-grab active:cursor-grabbing touch-none space-y-1",
            getStatusColor(),
            isDragging && "shadow-lg opacity-75"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{assignment.startTime || 'N/A'} - {assignment.endTime || 'N/A'}</span>
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1.5">
                {assignment.isSubstitution && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ArrowRightLeft className="h-3 w-3 text-orange-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Vertretungseinsatz</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {assignment.isTeam && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Users className="h-3 w-3 text-purple-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Team-Einsatz (mehrere Mitarbeiter)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {assignment.isRecurring && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Repeat className="h-3 w-3 text-blue-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Wiederkehrender Einsatz (Serie)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            <span>{assignment.hours.toFixed(2)}h</span>
          </div>
          <p className="font-bold text-sm truncate">{assignment.title}</p>
          {assignment.service_type && (
            <Badge
              variant="secondary"
              className={cn("text-xs font-normal border-none w-full justify-start", badgeTextColorClass)}
              style={{ backgroundColor: serviceColor }}
            >
              <span
                className="h-2 w-2 rounded-full mr-1.5 shrink-0"
                style={{ backgroundColor: isLightColor(serviceColor) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)' }}
              />
              <span className="truncate">{assignment.service_type}</span>
            </Badge>
          )}
        </div>
      </AssignmentEditDialog>
    </>
  );
}