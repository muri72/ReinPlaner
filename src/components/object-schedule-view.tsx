"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock } from "lucide-react";

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const germanDayNames: { [key: string]: string } = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};

interface ObjectData {
  daily_schedules: any[];
  recurrence_interval_weeks: number;
  start_week_offset: number;
}

interface ObjectScheduleViewProps {
  object: ObjectData;
}

export function ObjectScheduleView({ object }: ObjectScheduleViewProps) {
  const hasSchedule = object.daily_schedules && object.daily_schedules.some(week => 
    Object.values(week).some((day: any) => day && day.hours > 0)
  );

  if (!hasSchedule) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Kein Wochenplan für dieses Objekt hinterlegt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Wiederholung alle <strong>{object.recurrence_interval_weeks}</strong> Woche(n) mit einem Offset von <strong>{object.start_week_offset}</strong> Woche(n).
      </div>
      {object.daily_schedules.map((weekSchedule, weekIndex) => (
        <div key={weekIndex}>
          <h4 className="font-semibold mb-2">Woche {weekIndex + 1}</h4>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wochentag</TableHead>
                  <TableHead>Stunden</TableHead>
                  <TableHead>Startzeit</TableHead>
                  <TableHead>Endzeit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayNames.map(day => {
                  const daySchedule = (weekSchedule as any)?.[day];
                  return (
                    <TableRow key={day}>
                      <TableCell className="font-medium">{germanDayNames[day]}</TableCell>
                      <TableCell>{daySchedule?.hours?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell>{daySchedule?.start || 'N/A'}</TableCell>
                      <TableCell>{daySchedule?.end || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}