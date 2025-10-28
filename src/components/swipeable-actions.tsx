"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwipeableAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  color: string;
  showOnly?: boolean;
}

interface SwipeableActionsProps {
  leftActions: SwipeableAction[];
  rightActions: SwipeableAction[];
  onActionExecuted?: (action: SwipeableAction) => void;
  children: React.ReactNode;
}

export function SwipeableActions({ leftActions, rightActions, onActionExecuted, children }: SwipeableActionsProps) {
  return (
    <div className="relative">
      {children}
    </div>
  );
}