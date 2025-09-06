"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimeProgressBarProps {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const TimeProgressBar: React.FC<TimeProgressBarProps> = ({ startTime, endTime }) => {
  const [progress, setProgress] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState('');

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = parseTimeToMinutes(startTime);
      let endMinutes = parseTimeToMinutes(endTime);

      // Handle overnight shifts
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
        if (currentTimeInMinutes < startMinutes) {
          // Adjust current time if it's on the next day
          // currentTimeInMinutes += 24 * 60;
        }
      }

      const totalDuration = endMinutes - startMinutes;
      const elapsedDuration = currentTimeInMinutes - startMinutes;

      const calculatedProgress = totalDuration > 0
        ? Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100))
        : 0;
      
      setProgress(calculatedProgress);
      setCurrentTimeLabel(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-4 bg-muted rounded-full relative overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-destructive"
              style={{ left: `${progress}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fortschritt: {Math.round(progress)}%</p>
          <p>Aktuelle Uhrzeit: {currentTimeLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};