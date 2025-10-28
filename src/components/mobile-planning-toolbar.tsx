"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Plus, 
  Menu, 
  Search,
  Filter,
  Bell,
  Settings,
  Download,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileQuickFilters } from "./mobile-quick-filters";
import { MobileEmployeeSelector } from "./mobile-employee-selector";

interface Employee {
  id: string;
  name: string;
  avatar_url?: string;
  totalHours: number;
  plannedHours: number;
  status: 'available' | 'busy' | 'off';
}

interface MobilePlanningToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  notificationCount?: number;
  employees?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    totalHours: number;
    plannedHours: number;
    status: string;
  }>;
  selectedEmployee?: string | null;
  onEmployeeSelect?: (employeeId: string) => void;
  filters?: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }>;
  activeFilters?: string[];
  onFilterToggle?: (filterId: string) => void;
  onClearFilters?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function MobilePlanningToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onExport,
  onImport,
  notificationCount = 0,
  employees = [],
  selectedEmployee,
  onEmployeeSelect,
  filters = [],
  activeFilters = [],
  onFilterToggle,
  onClearFilters,
  searchQuery = "",
  onSearchChange,
}: MobilePlanningToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const menuItems = [
    {
      icon: <Download className="h-4 w-4" />,
      label: "Exportieren",
      action: onExport || (() => {}),
    },
    {
      icon: <Upload className="h-4 w-4" />,
      label: "Importieren",
      action: onImport || (() => {}),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Einstellungen",
      action: () => console.log('Settings'),
    },
  ];

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Main Toolbar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Date Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="mobile-tap-target"
            >
              ←
            </Button>
            
            <div className="text-center min-w-0">
              <div className="text-sm font-medium">
                {viewMode === 'day' && currentDate.toLocaleDateString('de-DE', { weekday: 'long' })}
                {viewMode === 'week' && `KW ${Math.ceil((currentDate.getDate() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 1) / 7)}`}
                {viewMode === 'month' && currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-lg font-bold">
                {currentDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="mobile-tap-target"
            >
              →
            </Button>
          </div>

          {/* Center Section - View Mode */}
          <div className="flex items-center space-x-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('day')}
              className="mobile-tap-target"
            >
              Tag
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('week')}
              className="mobile-tap-target"
            >
              Woche
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('month')}
              className="mobile-tap-target"
            >
              Monat
            </Button>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="mobile-tap-target"
            >
              Heute
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "mobile-tap-target relative",
                activeFilters.length > 0 && "text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              {activeFilters.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmployeeSelector(!showEmployeeSelector)}
              className={cn(
                "mobile-tap-target relative",
                selectedEmployee && "text-primary"
              )}
            >
              <Users className="h-4 w-4" />
              {selectedEmployee && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
                className="mobile-tap-target"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {(searchQuery !== undefined || onSearchChange) && (
        <div className="px-4 pb-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Aufträge suchen..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-sm mobile-input"
            />
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 pb-3 bg-background border-b border-border">
          <MobileQuickFilters
            filters={filters}
            activeFilters={activeFilters}
            onFilterToggle={onFilterToggle || (() => {})}
            onClearAll={onClearFilters || (() => {})}
            searchPlaceholder="Aufträge filtern..."
          />
        </div>
      )}

      {/* Employee Selector */}
      {showEmployeeSelector && (
        <div className="px-4 pb-3 bg-background border-b border-border">
          <MobileEmployeeSelector
            employees={employees}
            selectedEmployee={selectedEmployee}
            onEmployeeSelect={onEmployeeSelect || (() => {})}
            compact={true}
          />
        </div>
      )}

      {/* Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="absolute top-16 right-4 bg-background border border-border rounded-lg shadow-lg w-48">
            <div className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-accent rounded-lg transition-colors mobile-tap-target"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}