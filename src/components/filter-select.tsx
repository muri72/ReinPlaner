"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface FilterSelectProps {
  paramName: string;
  placeholder: string;
  options: { value: string; label: string }[];
  currentValue: string;
  className?: string;
}

export function FilterSelect({ paramName, placeholder, options, currentValue, className }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      params.set('page', '1'); // Reset to first page on filter change
      router.replace(`${pathname}?${params.toString()}`);
    },
    [paramName, pathname, router, searchParams]
  );

  const selectedValue = currentValue || "all";

  return (
    <div className={cn(className)}>
      <Select onValueChange={handleFilterChange} value={selectedValue}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}