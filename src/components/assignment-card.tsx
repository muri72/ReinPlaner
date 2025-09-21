"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface Assignment {
  id: string;
  orderId: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  hours: number;
  isRecurring: boolean;
  isTeam: boolean;
  status: 'completed' | 'pending' | 'future';
  objectName: string | null;
  serviceType: string | null;
}

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const serviceTypeColors: { [key: string]: string } = {
    "Unterhaltsreinigung": "bg-green-500/20 border-green-500/50 text-green-800 dark:text-green-300",
    "Glasreinigung": "bg-blue-500/20 border-blue-500/50 text-blue-800 dark:text-blue-300",
    "Grundreinigung": "bg-yellow-500/20 border-yellow-500/50 text-yellow-800 dark:text-yellow-300",
    "Graffitientfernung": "bg-red-500/20 border-red-500/50 text-red-800 dark:text-red-300",
    "Sonderreinigung": "bg-purple-500/20 border-purple-500/50 text-purple-800 dark:text-purple-300",
  };
  const defaultColor = "bg-gray-500/20 border-gray-500/50 text-gray-800 dark:text-gray-300";
  const colorClass = assignment.serviceType ? serviceTypeColors[assignment.serviceType] || defaultColor : defaultColor;

  return (
    <div className={cn("p-1.5 rounded-md border shadow-sm cursor-pointer hover:bg-card/80", colorClass)}>
      <div className="ml-1">
        <p className="font-semibold text-xs truncate">{assignment.objectName || assignment.title}</p>
        <div className="flex items-center justify-between text-xs mt-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{assignment.startTime || 'N/A'} - {assignment.endTime || 'N/A'}</span>
          </div>
          <Badge variant="secondary" className="px-1 py-0 text-xs bg-white/50 dark:bg-black/20">{assignment.serviceType || 'Allgemein'}</Badge>
        </div>
      </div>
    </div>
  );
}