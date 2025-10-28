"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Action {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  color: string;
}

interface SwipeableActionsProps {
  children: React.ReactNode;
  leftActions?: Action[];
  rightActions?: Action[];
  onActionExecuted?: (action: Action) => void;
  threshold?: number;
}

export function SwipeableActions({ 
  children, 
  leftActions = [], 
  rightActions = [], 
  onActionExecuted,
  threshold = 100 
}: SwipeableActionsProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      setIsDragging(true);
      setActiveAction(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const currentX = e.touches[0].clientX;
      const offset = currentX - startX.current;
      setDragOffset(offset);

      // Determine which action should be highlighted
      if (offset < -threshold / 2 && leftActions.length > 0) {
        setActiveAction(leftActions[0]);
      } else if (offset > threshold / 2 && rightActions.length > 0) {
        setActiveAction(rightActions[0]);
      } else {
        setActiveAction(null);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;

      setIsDragging(false);
      
      // Execute action if threshold is crossed
      if (dragOffset < -threshold && leftActions.length > 0) {
        leftActions[0].action();
        onActionExecuted?.(leftActions[0]);
      } else if (dragOffset > threshold && rightActions.length > 0) {
        rightActions[0].action();
        onActionExecuted?.(rightActions[0]);
      }

      // Reset
      setTimeout(() => {
        setDragOffset(0);
        setActiveAction(null);
      }, 300);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [leftActions, rightActions, onActionExecuted, threshold, isDragging, dragOffset]);

  return (
    <div 
      ref={elementRef}
      className={cn(
        "relative touch-pan-y",
        isDragging && "transition-none"
      )}
      style={{
        transform: isDragging ? `translateX(${dragOffset}px)` : 'translateX(0)',
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Left Action Indicator */}
      {leftActions.length > 0 && (
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center bg-gradient-to-r from-blue-500 to-transparent text-white transition-all duration-200",
            dragOffset < -threshold / 2 ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex flex-col items-center">
            {leftActions[0].icon}
            <span className="text-xs font-medium">{leftActions[0].label}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-grow">
        {children}
      </div>

      {/* Right Action Indicator */}
      {rightActions.length > 0 && (
        <div 
          className={cn(
            "absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center bg-gradient-to-l from-green-500 to-transparent text-white transition-all duration-200",
            dragOffset > threshold / 2 ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex flex-col items-center">
            {rightActions[0].icon}
            <span className="text-xs font-medium">{rightActions[0].label}</span>
          </div>
        </div>
      )}

      {/* Active Action Background */}
      {activeAction && (
        <div 
          className={cn(
            "absolute inset-0 opacity-20 transition-all duration-200",
            activeAction.color === "bg-blue-500" && "bg-blue-500",
            activeAction.color === "bg-green-500" && "bg-green-500",
            activeAction.color === "bg-gray-500" && "bg-gray-500"
          )}
        />
      )}
    </div>
  );
}