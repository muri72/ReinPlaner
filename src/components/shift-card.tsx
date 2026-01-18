"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Repeat, Users, ArrowRightLeft, CheckCircle2, CircleDot, XCircle, MapPin, Calendar, User, Layers, Coffee, Car } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { ShiftAssignment } from "@/lib/actions/shift-planning";
import { isToday, isBefore, isAfter, parseISO, startOfDay, format } from "date-fns";
import { de } from "date-fns/locale";

interface ShiftCardProps {
  shift: ShiftAssignment;
  onSuccess: () => void;
  onEdit?: (shiftId: string) => void;
  teamMembers?: { employee_id: string; employee_name: string; avatar_url?: string }[];
  isMultiShift?: boolean;
}

const statusConfig = {
  scheduled: { border: "border-blue-500", icon: CircleDot, label: "Geplant", color: "text-blue-500", bg: "bg-blue-50" },
  in_progress: { border: "border-yellow-500", icon: CircleDot, label: "In Bearbeitung", color: "text-yellow-500", bg: "bg-yellow-50" },
  completed: { border: "border-green-500", icon: CheckCircle2, label: "Abgeschlossen", color: "text-green-500", bg: "bg-green-50" },
  cancelled: { border: "border-red-500", icon: XCircle, label: "Abgesagt", color: "text-red-500", bg: "bg-red-50" },
};

function calculateRealtimeStatus(shift: ShiftAssignment) {
  const now = new Date();
  const today = startOfDay(now);

  if (shift.status === "cancelled") {
    return shift.status;
  }

  const shiftDate = parseISO(shift.shift_date);

  if (isBefore(shiftDate, today)) {
    return "completed";
  } else if (isToday(shiftDate)) {
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
    return "in_progress";
  }

  return "scheduled";
}

export function ShiftCard({ shift, onSuccess, onEdit, teamMembers, isMultiShift }: ShiftCardProps) {
  const draggableId = shift.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { shift },
  });

  const [realtimeStatus, setRealtimeStatus] = React.useState(() => calculateRealtimeStatus(shift));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStatus(calculateRealtimeStatus(shift));
    }, 60000);
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
  const formattedDate = format(parseISO(shift.shift_date), "EEEE, d. MMMM yyyy", { locale: de });
  const allTeamMembers = teamMembers || shift.employees;

  const handleClick = (e: React.MouseEvent) => {
    if (onEdit) {
      onEdit(shift.assignment_id || shift.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 rounded-md border-l-4 bg-card text-card-foreground shadow-sm transition-all duration-200 group relative cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        statusInfo.border,
        isDragging && "shadow-lg opacity-75 scale-102"
      )}
      onClick={handleClick}
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute top-0 left-0 right-0 h-5 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/10 to-transparent rounded-t-md z-20"
      >
        <div className="w-8 h-0.5 bg-black/30 rounded-full" />
      </div>

      <div className="space-y-1.5 relative z-10 cursor-pointer">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>
              {shift.start_time?.slice(0, 5) || "N/A"} - {shift.end_time?.slice(0, 5) || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {realtimeStatus === 'in_progress' && (
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-yellow-400 animate-ping opacity-75" />
              </div>
            )}
            <StatusIcon className={cn("h-3 w-3", statusInfo.color)} />
            {isSubstitute && <ArrowRightLeft className="h-3 w-3 text-orange-500" />}
            {isMultiShift && <Layers className="h-3 w-3 text-indigo-500" />}
            {shift.is_team && !isMultiShift && <Users className="h-3 w-3 text-purple-500" />}
            {shift.is_recurring && <Repeat className="h-3 w-3 text-blue-500" />}
          </div>
        </div>

        <div className="flex items-center text-xs text-muted-foreground">
          <span className="font-medium">{shift.estimated_hours?.toFixed(2) || "0.00"}h</span>
        </div>

        {/* Travel time and break time */}
        {(shift.travel_time_minutes && shift.travel_time_minutes > 0) || (shift.break_time_minutes && shift.break_time_minutes > 0) ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {shift.travel_time_minutes && shift.travel_time_minutes > 0 ? (
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>{shift.travel_time_minutes} min</span>
              </div>
            ) : null}
            {shift.break_time_minutes && shift.break_time_minutes > 0 ? (
              <div className="flex items-center gap-1">
                <Coffee className="h-3 w-3" />
                <span>{shift.break_time_minutes} min</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="font-bold text-sm truncate pr-2">{shift.job_title}</p>

        <div className="flex items-center gap-1">
          {(shift.object_address || shift.object_name) && (
            <a
              href={shift.object_address ? `https://maps.google.com/maps?q=${encodeURIComponent(shift.object_address)}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground truncate inline-flex items-center gap-1 hover:text-primary hover:underline transition-all"
              onClick={(e) => {
                if (!shift.object_address) {
                  e.preventDefault();
                  return;
                }
                // On mobile, try to open native maps
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                  // Use maps: for Apple Maps (universal on iOS)
                  window.location.href = `maps:0,0?q=${encodeURIComponent(shift.object_address)}`;
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

      {shift.service_title && (
        <Badge
          variant="secondary"
          className={cn("text-xs font-normal border-none w-full justify-start mt-1", badgeTextColorClass)}
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
  );
}
