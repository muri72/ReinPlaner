"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback } from "react";

interface FilterSelectProps {
  paramName: string;
  label: string;
  options: { value: string; label: string }[];
  currentValue: string;
}

export function FilterSelect({ paramName, label, options, currentValue }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      params.set('page', '1'); // Reset to first page on filter change
      router.replace(`${pathname}?${params.toString()}`);
    },
    [paramName, pathname, router, searchParams]
  );

  return (
    <div>
      <Label htmlFor={paramName}>{label}</Label>
      <Select onValueChange={handleFilterChange} value={currentValue}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Alle ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Alle</SelectItem>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}