"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users, ArrowRightLeft, CheckCircle2, CircleDot, XCircle, MapPin, Calendar, User } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShiftAssignment } from "@/lib/actions/shift-planning";
import { isToday, isBefore, isAfter, parseISO, startOfDay, format } from "date-fns";
import { de } from "date-fns/locale";

interface ShiftCardProps {
  shift: ShiftAssignment;
  onSuccess: () => void;
  onEdit?: (shiftId: string) => void;
  // Optional: Pass team members info from parent
  teamMembers?: { employee_id: string; employee_name: string; avatar_url?: string }[];
}

const statusConfig = {
  scheduled: { border: "border-blue-500", icon: CircleDot, label: "Geplant", color: "text-blue-500", bg: "bg-blue-50" },
  in_progress: { border: "border-yellow-500", icon: CircleDot, label: "In Bearbeitung", color: "text-yellow-500", bg: "bg-yellow-50" },
  completed: { border: "border-green-500", icon: CheckCircle2, label: "Abgeschlossen", color: "text-green-500", bg: "bg-green-50" },
  cancelled: { border: "border-red-500", icon: XCircle, label: "Abgesagt", color: "text-red-500", bg: "bg-red-50" },
  no_show: { border: "border-gray-500", icon: XCircle, label: "Nicht erschienen", color: "text-gray-500", bg: "bg-gray-50" },
};

// Helper function to calculate status based on date and time
function calculateRealtimeStatus(shift: ShiftAssignment) {
  const now = new Date();
  const today = startOfDay(now);

  // If it's explicitly cancelled or no_show, use that status
  if (shift.status === "cancelled" || shift.status === "no_show") {
    return shift.status;
  }

  // Parse the shift date
  const shiftDate = parseISO(shift.shift_date);

  if (isBefore(shiftDate, today)) {
    // Date is in the past
    return "completed";
  } else if (isToday(shiftDate)) {
    // Date is today - check the actual time
    if (shift.start_time && shift.end_time) {
      const [startHour, startMin] = shift.start_time.split(":").map(Number);
      const [endHour, endMin] = shift.end_time.split(":").map(Number);

      const shiftStart = new Date(now);
      shiftStart.setHours(startHour, startMin, 0, 0);

      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour, endMin, 0, 0);

      if (isBefore(now, shiftStart)) {
        return "scheduled";
      } else if (isAfter(now, shiftEnd)) {
        return "completed";
      } else {
        return "in_progress";
      }
    }
    // No time specified, assume in_progress for today
    return "in_progress";
  }

  // Future dates
  return "scheduled";
}

export function ShiftCard({ shift, onSuccess, onEdit, teamMembers }: ShiftCardProps) {
  // Use the actual shift.id for draggable - simple and direct
  const draggableId = shift.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { shift },
  });

  // Update status in real-time every minute
  const [realtimeStatus, setRealtimeStatus] = React.useState(() => calculateRealtimeStatus(shift));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStatus(calculateRealtimeStatus(shift));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [shift]);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
      }
    : undefined;

  const statusInfo = statusConfig[realtimeStatus as keyof typeof statusConfig] || statusConfig.scheduled;
  const StatusIcon = statusInfo.icon;

  // Dynamic Service Colors
  const serviceColor = shift.service_color || "#6b7280";

  const isLightColor = (hexColor: string) => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const badgeTextColorClass = isLightColor(serviceColor) ? "text-gray-800" : "text-white";

  const isSubstitute = shift.employees.some((e) => e.role === "substitute");

  // Format date for tooltip
  const formattedDate = format(parseISO(shift.shift_date), "EEEE, d. MMMM yyyy", { locale: de });

  // Get all team members (from props or shift data)
  const allTeamMembers = teamMembers || shift.employees;
  const otherTeamMembers = allTeamMembers.filter(e => e.employee_id !== shift.employees[0]?.employee_id);

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger edit if this was a click, not a drag release
    if (onEdit) {
      // Use assignment_id for editing, which is the same for all shifts in a series
      onEdit(shift.assignment_id || shift.id);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "p-2 rounded-md border-l-4 bg-card text-card-foreground shadow-sm transition-all duration-200 group relative cursor-pointer z-10",
          statusInfo.border,
          isDragging && "shadow-lg opacity-75 scale-102"
        )}
        onClick={handleClick}
      >
        {/* Drag Handle Strip - top area for dragging only */}
        <div
          {...listeners}
          {...attributes}
          className="absolute top-0 left-0 right-0 h-5 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/10 to-transparent rounded-t-md z-20"
        >
          <div className="w-8 h-0.5 bg-black/30 rounded-full" />
        </div>
          {/* Main Tooltip Trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1.5 relative z-10">
              {/* Time and Icons Row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>
                    {shift.start_time?.slice(0, 5) || "N/A"} - {shift.end_time?.slice(0, 5) || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Live Indicator - pulsierender Punkt bei in_progress */}
                  {realtimeStatus === 'in_progress' && (
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                      <div className="absolute inset-0 h-2 w-2 rounded-full bg-yellow-400 animate-ping opacity-75" />
                    </div>
                  )}

                  {/* Static Status Indicator Dot */}
                  {!realtimeStatus && (
                    <div className={cn("h-2 w-2 rounded-full", statusInfo.bg)} />
                  )}

                  {/* Status Icon */}
                  <StatusIcon className={cn("h-3 w-3", statusInfo.color)} />

                  {/* Substitute Icon */}
                  {isSubstitute && (
                    <ArrowRightLeft className="h-3 w-3 text-orange-500" />
                  )}

                  {/* Team Icon */}
                  {shift.is_team && (
                    <Users className="h-3 w-3 text-purple-500" />
                  )}

                  {/* Recurring Icon */}
                  {shift.is_recurring && (
                    <Repeat className="h-3 w-3 text-blue-500" />
                  )}
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="font-medium">{shift.estimated_hours?.toFixed(2) || "0.00"}h</span>
              </div>

              {/* Title */}
              <p className="font-bold text-sm truncate pr-2">{shift.job_title}</p>

              {/* Object and Service Row */}
              <div className="flex items-center gap-1">
                {(shift.object_address || shift.object_name) && (
                  <a
                    href={shift.object_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shift.object_address)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground truncate inline-flex items-center gap-1 hover:text-primary hover:underline transition-all"
                    onClick={(e) => {
                      if (!shift.object_address) {
                        e.preventDefault();
                        return;
                      }
                      // Try to open native maps app
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      if (isMobile) {
                        // Use geo URI for native maps (Apple Maps, etc.)
                        const address = shift.object_address || '';
                        window.location.href = `geo:0,0?q=${encodeURIComponent(address)}`;
                        e.preventDefault();
                      }
                    }}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{shift.object_address || shift.object_name}</span>
                  </a>
                )}
              </div>
            </div>
          </TooltipTrigger>

          {/* Enhanced Tooltip Content */}
          <TooltipContent
            side="right"
            className="max-w-xs p-3 space-y-2 bg-popover border shadow-lg z-[100]"
            sideOffset={8}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm leading-tight">{shift.job_title}</p>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] h-5 px-1.5", badgeTextColorClass)}
                    style={{ backgroundColor: serviceColor }}
                  >
                    {shift.service_title || "Kein Service"}
                  </Badge>
                </div>
              </div>
              <Badge className={cn("text-xs", statusInfo.bg, statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>

            <hr className="border-border" />

            {/* Details Grid */}
            <div className="space-y-1.5 text-xs">
              {/* Date */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{shift.start_time?.slice(0, 5) || "N/A"} - {shift.end_time?.slice(0, 5) || "N/A"} ({shift.estimated_hours?.toFixed(2) || "0.00"}h)</span>
              </div>

              {/* Object */}
              {(shift.object_address || shift.object_name) && (
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {shift.object_address ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shift.object_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center hover:text-primary hover:underline transition-colors"
                      onClick={(e) => {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile && shift.object_address) {
                          const address = shift.object_address || '';
                          window.location.href = `geo:0,0?q=${encodeURIComponent(address)}`;
                          e.preventDefault();
                        }
                      }}
                    >
                      {shift.object_address}
                    </a>
                  ) : (
                    <span>{shift.object_name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Team Members Section */}
            {shift.is_team && allTeamMembers.length > 1 && (
              <>
                <hr className="border-border" />
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Team ({allTeamMembers.length} Mitarbeiter)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {allTeamMembers.map((member) => (
                      <Badge
                        key={member.employee_id}
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 px-1.5",
                          member.employee_id === shift.employees[0]?.employee_id
                            ? "bg-primary/10 border-primary"
                            : ""
                        )}
                      >
                        {member.employee_name}
                        {member.employee_id === shift.employees[0]?.employee_id && " (Du)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Single Employee */}
            {!shift.is_team && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{shift.employees[0]?.employee_name || "Nicht zugewiesen"}</span>
                </div>
              </>
            )}

            {/* Recurring Info */}
            {shift.is_recurring && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  <span>Wiederkehrender Einsatz (Serie)</span>
                </div>
              </>
            )}

            {/* Substitute Info */}
            {isSubstitute && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Vertretungseinsatz</span>
                </div>
              </>
            )}

            {/* Status Info */}
            {realtimeStatus === 'in_progress' && (
              <hr className="border-border" />
            )}
          </TooltipContent>
        </Tooltip>

        {/* Service Badge - Outside Tooltip for visibility */}
        {shift.service_title && (
          <Badge
            variant="secondary"
            className={cn("text-xs font-normal border-none w-full justify-start", badgeTextColorClass)}
            style={{ backgroundColor: serviceColor }}
          >
            <span
              className="h-2 w-2 rounded-full mr-1.5 shrink-0"
              style={{
                backgroundColor: isLightColor(serviceColor)
                  ? "rgba(0,0,0,0.2)"
                  : "rgba(255,255,255,0.4)",
              }}
            />
            <span className="truncate">{shift.service_title}</span>
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
