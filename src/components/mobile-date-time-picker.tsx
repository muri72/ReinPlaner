"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MobileDateTimePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  mode?: 'date' | 'time' | 'datetime';
}

export function MobileDateTimePicker({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  showTime = true,
  mode = 'datetime',
}: MobileDateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [selectedHour, setSelectedHour] = useState(value?.getHours() || 12);
  const [selectedMinute, setSelectedMinute] = useState(value?.getMinutes() || 0);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (mode === 'date') {
      onChange?.(date);
    }
  };

  const handleTimeChange = () => {
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(selectedHour);
    newDateTime.setMinutes(selectedMinute);
    onChange?.(newDateTime);
  };

  const handleConfirm = () => {
    if (mode === 'datetime') {
      handleTimeChange();
    }
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <Card className="glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg">{label || "Datum & Zeit wählen"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Picker */}
        {mode !== 'time' && (
          <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <div className="font-semibold">
                  {format(currentMonth, 'MMMM yyyy', { locale: de })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Day headers */}
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold p-2 text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {monthDays.map((date, index) => {
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isCurrentDay = isToday(date);
                const isSelected = isSameDay(date, selectedDate);
                const isDisabled = isDateDisabled(date);

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    className={cn(
                      "min-h-[40px] p-2 border rounded-lg cursor-pointer transition-colors text-center",
                      !isCurrentMonth && "opacity-40",
                      isCurrentDay && "bg-primary/10 border-primary",
                      isSelected && "bg-primary text-primary-foreground",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      !isDisabled && "hover:bg-accent"
                    )}
                  >
                    <div className="font-medium">
                      {format(date, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Picker */}
        {showTime && mode !== 'date' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Uhrzeit:</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Hours */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Stunden</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 24 }, (_, i) => (
                    <Button
                      key={i}
                      variant={selectedHour === i ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedHour(i)}
                      className="h-10"
                    >
                      {i.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Minuten</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => (
                    <Button
                      key={i * 5}
                      variant={selectedMinute === i * 5 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMinute(i * 5)}
                      className="h-10"
                    >
                      {(i * 5).toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Value Display */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Ausgewählt:</div>
            <div className="font-semibold">
              {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
              {showTime && (
                <span className="ml-2">
                  {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {mode === 'datetime' && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onChange?.(new Date())}
              className="flex-1"
            >
              Heute
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              Übernehmen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}