"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GenericGridSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  showBadges?: boolean;
  badgeCount?: number;
}

export function GenericGridSkeleton({
  count = 6,
  showAvatar = false,
  showBadges = true,
  badgeCount = 2
}: GenericGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3 flex-1">
              {showAvatar && (
                <Skeleton className="h-10 w-10 rounded-full" />
              )}
              <div className="space-y-1 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            {showBadges && (
              <div className="flex items-center gap-2 pt-2">
                {Array.from({ length: badgeCount }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-20 rounded-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
