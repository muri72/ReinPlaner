"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin } from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: 'completed' | 'pending' | 'future';
  service_type?: string;
  object_name?: string;
}

interface MobileCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  assignments: { [date: string]: Assignment[] };
  onAssignmentClick?: (assignment: Assignment) => void;
}

const serviceTypeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-green-500",
  "Glasreinigung": "bg-cyan-500",
  "Grundreinigung": "bg-blue-500",
  "Graffitientfernung": "bg-orange-500",
  "Sonderreinigung": "bg-purple-500",
  "default": "bg-gray-500",
};

export function MobileCalendar({ 
  currentDate, 
  onDateChange, 
  assignments,
  onAssignmentClick 
}: MobileCalendarProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWeekDays = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day;
    const weekStart = new Date(start.setDate(diff - (day === 0 ? 6 : day - 1)));
    
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const weekDays = viewMode === 'week' ? getWeekDays() : monthDays;

  const handlePrev = () => {
    if (viewMode === 'week') {
      onDateChange(subDays(currentDate, 7));
    } else {
      onDateChange(subDays(currentDate, 30));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      onDateChange(addDays(currentDate, 7));
    } else {
      onDateChange(addDays(currentDate, 30));
    }
  };

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    if (window.innerWidth < 768) {
      // On mobile, switch to day view when selecting a date
      setViewMode('day');
    }
  };

  const getAssignmentsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return assignments[dateString] || [];
  };

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">Kalender</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'day' ? 'week' : 'day')}
          >
            {viewMode === 'day' ? 'Woche' : 'Tag'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="font-semibold">
              {format(currentDate, viewMode === 'week' ? "'KW' ww yyyy" : "MMMM yyyy", { locale: de })}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(currentDate, 'EEEE, dd. MMMM', { locale: de })}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          {/* Day headers */}
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
            <div key={day} className="text-center font-semibold p-2 text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {weekDays.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDay = isToday(date);
            const dayAssignments = getAssignmentsForDate(date);
            const hasAssignments = dayAssignments.length > 0;

            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                className={cn(
                  "min-h-[60px] p-1 border rounded-lg cursor-pointer transition-colors",
                  !isCurrentMonth && "opacity-40",
                  isCurrentDay && "bg-primary/10 border-primary",
                  hasAssignments && "bg-accent/50",
                  "hover:bg-accent"
                )}
              >
                <div className="text-center font-medium mb-1">
                  {format(date, 'd')}
                </div>

                {/* Assignment indicators */}
                {hasAssignments && (
                  <div className="space-y-1">
                    {dayAssignments.slice(0, 2).map((assignment, idx) => (
                      <div
                        key={assignment.id}
                        onClick={() => onAssignmentClick?.(assignment)}
                        className="text-xs p-1 rounded bg-background border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate">
                            {assignment.startTime?.slice(0, 5)}-{assignment.endTime?.slice(0, 5)}
                          </span>
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              serviceTypeColors[assignment.service_type || 'default']
                            )}
                          />
                        </div>
                        <div className="text-muted-foreground truncate">
                          {assignment.title}
                        </div>
                        {assignment.object_name && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{assignment.object_name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {dayAssignments.length > 2 && (
                      <div className="text-xs text-center text-muted-foreground">
                        +{dayAssignments.length - 2} weitere
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mt-4">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="px-3"
            >
              Tag
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="px-3"
            >
              Woche
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}