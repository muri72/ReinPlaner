"use client";

import React from "react";
import { formatLiveTime } from "@/lib/utils/time-tracking-utils";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimeProgressDisplayProps {
  plannedMinutes: number | null;
  actualSeconds: number;
}

export function TimeProgressDisplay({
  plannedMinutes,
  actualSeconds,
}: TimeProgressDisplayProps) {
  if (plannedMinutes === null || plannedMinutes <= 0) return null;

  const plannedSeconds = plannedMinutes * 60;
  const progressPercentage = plannedSeconds > 0 ? (actualSeconds / plannedSeconds) * 100 : 0;
  const isOvertime = actualSeconds > plannedSeconds;

  return (
    <div className="space-y-2 pt-2 mt-2 border-t">
      <div className="flex justify-between text-sm font-medium">
        <span>Tatsächliche Zeit: {formatLiveTime(actualSeconds)}</span>
        <span>Geplante Zeit: {formatDuration(plannedMinutes)}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
        <div
          className={cn(
            "h-4 rounded-full transition-all duration-500",
            isOvertime ? "bg-destructive" : "bg-success"
          )}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>
      {isOvertime && (
        <p className="text-xs text-destructive text-center font-semibold">
          Überstunden: {formatLiveTime(actualSeconds - plannedSeconds)}
        </p>
      )}
    </div>
  );
}
