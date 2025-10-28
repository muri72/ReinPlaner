"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
  color?: string;
}

interface MobileFilterChipsProps {
  filters: FilterChip[];
  activeFilters: string[];
  onFilterToggle: (filterId: string) => void;
  onClearAll?: () => void;
  maxVisible?: number;
  scrollable?: boolean;
}

export function MobileFilterChips({ 
  filters, 
  activeFilters, 
  onFilterToggle, 
  onClearAll,
  maxVisible = 5,
  scrollable = true 
}: MobileFilterChipsProps) {
  const visibleFilters = filters.slice(0, maxVisible);
  const hasMore = filters.length > maxVisible;
  const activeCount = activeFilters.length;

  const getFilterColor = (filter: FilterChip) => {
    if (filter.color) return filter.color as any;
    if (filter.active) return 'default' as const;
    return 'outline' as const;
  };

  return (
    <div className="bg-card border-b border-border p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter</span>
          {activeCount > 0 && (
            <Badge variant="default" className="text-xs">
              {activeCount} aktiv
            </Badge>
          )}
        </div>
        
        {activeCount > 0 && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs mobile-tap-target"
          >
            Alle löschen
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <div className={cn(
        "flex flex-wrap gap-2",
        scrollable && "overflow-x-auto pb-2"
      )}>
        {visibleFilters.map((filter) => (
          <Button
            key={filter.id}
            variant={getFilterColor(filter)}
            size="sm"
            onClick={() => onFilterToggle(filter.id)}
            className={cn(
              "mobile-tap-target whitespace-nowrap",
              "h-8 px-3 text-xs font-medium",
              activeFilters.includes(filter.id) && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {filter.label}
            {filter.count !== undefined && (
              <Badge 
                variant="outline" 
                className="ml-2 text-xs min-w-[16px] text-center"
              >
                {filter.count}
              </Badge>
            )}
          </Button>
        ))}

        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            className="mobile-tap-target h-8 px-3 text-xs font-medium"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {activeCount} Filter{activeCount === 1 ? '' : ' aktiv'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs mobile-tap-target"
            >
              <X className="h-3 w-3 mr-1" />
              Zurücksetzen
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {filters
              .filter(filter => activeFilters.includes(filter.id))
              .map((filter) => (
                <Badge
                  key={filter.id}
                  variant="outline"
                  className="text-xs"
                >
                  {filter.label}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}