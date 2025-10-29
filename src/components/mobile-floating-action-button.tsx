"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface MobileFloatingActionButtonProps {
  mainAction: Action;
  additionalActions?: Action[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
}

export function MobileFloatingActionButton({
  mainAction,
  additionalActions = [],
  position = 'bottom-right',
  size = 'md',
}: MobileFloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2',
  };

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  const handleMainClick = () => {
    if (additionalActions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      mainAction.onClick();
    }
  };

  const handleActionClick = (action: Action) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div className={cn("fixed z-50", positionClasses[position])}>
      {/* Additional Actions */}
      {isExpanded && additionalActions.length > 0 && (
        <div className="absolute bottom-full mb-2 space-y-2">
          {additionalActions.map((action, index) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex items-center space-x-2 shadow-lg",
                "animate-scale-in"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {action.icon}
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainClick}
        className={cn(
          "rounded-full shadow-lg transition-all duration-200",
          sizeClasses[size],
          isExpanded && "rotate-45",
          mainAction.color || "bg-primary hover:bg-primary/90"
        )}
      >
        {isExpanded ? (
          <X className={iconSizes[size]} />
        ) : (
          <>
            {mainAction.icon}
            {additionalActions.length > 0 && (
              <ChevronUp className={cn("absolute -top-1 -right-1", iconSizes.sm)} />
            )}
          </>
        )}
      </Button>
    </div>
  );
}