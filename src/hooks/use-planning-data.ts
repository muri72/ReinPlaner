"use client";

import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { getShiftPlanningData, ShiftPlanningPageData } from "@/lib/actions/shift-planning";
import type { FilterValues } from "@/components/planning-toolbar";

export interface PlanningDataParams {
  currentDate: Date;
  viewMode: "day" | "week" | "month";
  query: string;
  filters: FilterValues;
}

export function usePlanningData({ currentDate, viewMode, query, filters }: PlanningDataParams) {
  // Calculate date range based on view mode
  const { startDate, endDate, daysToDisplay } = (() => {
    let start: Date;
    let end: Date;
    switch (viewMode) {
      case "day":
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case "month":
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case "week":
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return {
      startDate: start,
      endDate: end,
      daysToDisplay: eachDayOfInterval({ start, end })
    };
  })();

  // Create a stable query key
  const queryKey = [
    "planning-data",
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      query,
      objectFilters: filters.objects?.sort(),
      serviceFilters: filters.services?.sort(),
      showAvailableOnly: filters.showAvailableOnly,
    }
  ] as const;

  return useQuery({
    queryKey,
    queryFn: () =>
      getShiftPlanningData(startDate, endDate, {
        query,
        filters: {
          objects: filters.objects,
          services: filters.services,
          showAvailableOnly: filters.showAvailableOnly,
        }
      }),
    // React Query handles caching automatically
    staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - cache retention
    // Don't refetch on window focus for planning data
    refetchOnWindowFocus: false,
  });
}
