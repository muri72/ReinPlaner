"use client";

import React from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/use-offline-sync";

export function OfflineIndicator() {
  const { isOnline, isOffline, pendingActions, syncActions } = useOfflineSync();

  if (isOnline && pendingActions.length === 0) {
    return null; // Don't show indicator when online and no pending actions
  }

  return (
    <div className="fixed top-20 right-4 z-40">
      <div className={cn(
        "flex items-center space-x-2 p-3 rounded-lg shadow-lg",
        isOffline ? "bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      )}>
        <div className="flex items-center space-x-2">
          {isOffline ? (
            <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          ) : (
            <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-sm font-medium">
            {isOffline ? 'Offline' : 'Synchronisiere...'}
          </span>
        </div>
        
        {pendingActions.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingActions.length}
          </Badge>
        )}
        
        {isOnline && pendingActions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={syncActions}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}