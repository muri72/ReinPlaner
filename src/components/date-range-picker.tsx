'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value.from ? (
            value.to ? (
              <>
                {format(value.from, 'dd.MM.yyyy')} – {format(value.to, 'dd.MM.yyyy')}
              </>
            ) : (
              format(value.from, 'dd.MM.yyyy')
            )
          ) : (
            'Zeitraum auswählen'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: value.from, to: value.to }}
          onSelect={(range) => {
            onChange({ from: range?.from, to: range?.to });
            if (range?.from && range?.to) {
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
