"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SimpleListSkeletonProps {
  count?: number;
  showImage?: boolean;
  showMeta?: boolean;
}

export function SimpleListSkeleton({
  count = 5,
  showImage = false,
  showMeta = true
}: SimpleListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {showImage && (
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                {showMeta && (
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                )}
              </div>
              <Skeleton className="h-8 w-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
