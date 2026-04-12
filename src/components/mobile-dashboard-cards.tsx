"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  onClick?: () => void;
}

export function DashboardStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  className,
  onClick,
}: DashboardStatCardProps) {
  return (
    <Card
      className={cn(
        "bg-card cursor-pointer transition-all duration-200",
        "hover:shadow-md active:scale-[0.98]",
        onClick && "select-none touch-manipulation",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-primary/10 dark:bg-primary/20"
          )}
        >
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium mt-1",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardTaskCardProps {
  id: string;
  title: string;
  objectName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  status: "scheduled" | "in_progress" | "completed" | "pending";
  serviceType?: string | null;
  onClick?: () => void;
  onStart?: () => void;
  className?: string;
}

const statusConfig = {
  scheduled: {
    label: "Geplant",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In Bearbeitung",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
  },
  completed: {
    label: "Erledigt",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  pending: {
    label: "Ausstehend",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

export function DashboardTaskCard({
  title,
  objectName,
  startTime,
  endTime,
  hours,
  status,
  serviceType,
  onClick,
  onStart,
  className,
}: DashboardTaskCardProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Card
      className={cn(
        "bg-card transition-all duration-200",
        "hover:shadow-md active:scale-[0.98]",
        onClick && "cursor-pointer select-none touch-manipulation",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base leading-tight truncate">{title}</p>
            {objectName && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{objectName}</p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
              config.color
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {config.label}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {startTime && (
            <div className="flex items-center gap-1">
              <span>{startTime}</span>
              {endTime && <span>– {endTime}</span>}
            </div>
          )}
          {hours && <span>{hours}h</span>}
          {serviceType && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{serviceType}</span>
          )}
        </div>

        {/* Action */}
        {status === "scheduled" && onStart && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-base",
              "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
              "transition-colors duration-150",
              "flex items-center justify-center gap-2",
              "select-none touch-manipulation"
            )}
          >
            Auftrag starten
          </button>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  subtitle,
  action,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm text-primary font-medium hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
