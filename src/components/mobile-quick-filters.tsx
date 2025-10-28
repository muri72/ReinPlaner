"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Filter,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileFilterChips } from "./mobile-filter-chips";

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  active?: boolean;
}

interface MobileQuickFiltersProps {
  filters: QuickFilter[];
  activeFilters: string[];
  onFilterToggle: (filterId: string) => void;
  onClearAll?: () => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function MobileQuickFilters({ 
  filters, 
  activeFilters, 
  onFilterToggle, 
  onClearAll,
  onDateRangeChange,
  onSearchChange,
  searchPlaceholder = "Suchen..."
}: MobileQuickFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const handleDatePreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    setDateRange({ start, end });
    onDateRangeChange?.(start, end);
  };

  const datePresets = [
    { id: 'today', label: 'Heute', icon: <Calendar className="h-4 w-4" /> },
    { id: 'week', label: 'Woche', icon: <Calendar className="h-4 w-4" /> },
    { id: 'month', label: 'Monat', icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Schnellfilter
          </div>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="mobile-tap-target"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-sm mobile-input"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Zeitraum</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mobile-tap-target"
            >
              {showAdvanced ? 'Weniger' : 'Erweitert'}
            </Button>
          </div>

          {/* Quick Date Presets */}
          <div className="grid grid-cols-3 gap-2">
            {datePresets.map((preset) => (
              <Button
                key={preset.id}
                variant={dateRange ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => handleDatePreset(preset.id as 'today' | 'week' | 'month')}
                className={cn(
                  "mobile-tap-target flex flex-col items-center justify-center h-12",
                  dateRange && "border border-border"
                )}
              >
                {preset.icon}
                <span className="text-xs mt-1">{preset.label}</span>
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          {showAdvanced && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Von</label>
                  <input
                    type="date"
                    value={dateRange?.start ? dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const newStart = new Date(e.target.value);
                      const newRange = dateRange ? { ...dateRange, start: newStart } : { start: newStart, end: newStart };
                      setDateRange(newRange);
                      onDateRangeChange?.(newRange.start, newRange.end);
                    }}
                    className="w-full p-2 border border-border rounded-lg bg-background text-sm mobile-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bis</label>
                  <input
                    type="date"
                    value={dateRange?.end ? dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const newEnd = new Date(e.target.value);
                      const newRange = dateRange ? { ...dateRange, end: newEnd } : { start: newEnd, end: newEnd };
                      setDateRange(newRange);
                      onDateRangeChange?.(newRange.start, newRange.end);
                    }}
                    className="w-full p-2 border border-border rounded-lg bg-background text-sm mobile-input"
                  />
                </div>
              </div>
              
              {dateRange && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {dateRange.start.toLocaleDateString('de-DE')} - {dateRange.end.toLocaleDateString('de-DE')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Filters */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Status</span>
          <div className="grid grid-cols-2 gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilters.includes(filter.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterToggle(filter.id)}
                className={cn(
                  "mobile-tap-target h-12 justify-start",
                  activeFilters.includes(filter.id) && "ring-2 ring-primary ring-offset-2"
                )}
              >
                {filter.icon}
                <span className="ml-2">{filter.label}</span>
                {filter.count !== undefined && (
                  <Badge variant="outline" className="ml-auto text-xs min-w-[20px] text-center">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {activeFilters.length} Filter{activeFilters.length === 1 ? '' : ' aktiv'}
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
      </CardContent>
    </Card>
  );
}