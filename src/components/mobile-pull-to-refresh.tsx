"use client";

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  threshold?: number;
  children: React.ReactNode;
}

export function MobilePullToRefresh({
  onRefresh,
  isRefreshing = false,
  threshold = 80,
  children,
}: MobilePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshingInternal, setIsRefreshingInternal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing || isRefreshingInternal) return;
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing || isRefreshingInternal) return;
      
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      
      setIsPulling(false);
      
      if (pullDistance >= threshold && !isRefreshing && !isRefreshingInternal) {
        setIsRefreshingInternal(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshingInternal(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, isRefreshing, isRefreshingInternal, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        pullDistance > 0 && "mobile-pull-refresh"
      )}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0)',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200",
          pullDistance < threshold && "opacity-0",
          pullDistance >= threshold && "opacity-100"
        )}
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
        }}
      >
        <div className="flex items-center space-x-2 text-primary">
          <RefreshCw
            className={cn(
              "h-5 w-5",
              (isRefreshing || isRefreshingInternal) && "animate-spin"
            )}
          />
          <span className="text-sm font-medium">
            {pullDistance >= threshold ? "Loslassen zum Aktualisieren" : "Nach unten ziehen"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-scroll">
        {children}
      </div>
    </div>
  );
}