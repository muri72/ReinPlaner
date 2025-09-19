"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EmployeeWorkloadBarProps {
  planned: number;
  available: number;
}

export function EmployeeWorkloadBar({ planned, available }: EmployeeWorkloadBarProps) {
  const percentage = available > 0 ? (planned / available) * 100 : 0;
  const isOverloaded = percentage > 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div
              className={cn(
                "h-2.5 rounded-full",
                isOverloaded ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Geplant: {planned.toFixed(2)} Stunden</p>
          <p>Verfügbar: {available.toFixed(2)} Stunden</p>
          {isOverloaded && <p className="text-destructive">Überlastet!</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}