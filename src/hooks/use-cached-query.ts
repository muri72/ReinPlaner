"use client";

import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { getCachedData } from "@/lib/actions/cached-queries";

export interface UseCachedQueryOptions<TData> {
  /** Time in seconds for stale-while-revalidate */
  staleTime?: number;
  /** Time in seconds for garbage collection */
  gcTime?: number;
  /** Refetch when window gains focus */
  refetchOnFocus?: boolean;
  /** Custom query options to merge */
  queryOptions?: Partial<UseQueryOptions<TData, Error, TData, string[]>>;
}

export function useCachedQuery<TData>(
  key: string[],
  queryFn: () => Promise<TData>,
  options?: UseCachedQueryOptions<TData>
): UseQueryResult<TData, Error> {
  const fullKey = key.join(":");

  return useQuery<TData, Error, TData, string[]>({
    queryKey: key,
    queryFn: async () => {
      return getCachedData(fullKey, options?.staleTime ?? 30, queryFn);
    },
    staleTime: (options?.staleTime ?? 30) * 1000,
    gcTime: (options?.gcTime ?? 300) * 1000,
    refetchOnWindowFocus: options?.refetchOnFocus ?? false,
    ...options?.queryOptions,
  });
}
