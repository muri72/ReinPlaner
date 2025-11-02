"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface GenericTableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function GenericTableSkeleton({ rows = 5, cols = 4 }: GenericTableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 w-20" />
          ))}
        </div>
      ))}
    </div>
  );
}
