"use client";

import * as React from "react";
import { format, eachDayOfInterval, getDaysInMonth, startOfMonth, getDate } from "date-fns";
import { de } from "date-fns/locale";
import { getAbsencesForMonth } from "@/app/dashboard/absence-requests/actions";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // Import cn

interface EmployeeAbsenceData {
  [employeeId: string]: {
    name: string;
    absences: { [day: number]: { type: string; start_date: string; end_date: string } }; // day -> type, with full absence data
  };
}

const typeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const typeColors: { [key: string]: string } = {
  vacation: "bg-primary text-primary-foreground",
  sick_leave: "bg-warning text-warning-foreground",
  training: "bg-accent text-accent-foreground",
  other: "bg-muted text-muted-foreground",
};

export function AbsenceTimelineCalendar() {
  const [month, setMonth] = React.useState(new Date());
  const [employeeData, setEmployeeData] = React.useState<EmployeeAbsenceData>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAndProcessData = async () => {
      setLoading(true);
      const result = await getAbsencesForMonth(month);
      const processedData: EmployeeAbsenceData = {};

      if (result.success && result.data) {
        result.data.forEach((absence: any) => {
          if (!absence.employees) return;

          const employeeId = absence.employees.id;
          if (!processedData[employeeId]) {
            processedData[employeeId] = {
              name: `${absence.employees.first_name || ''} ${absence.employees.last_name || ''}`.trim(),
              absences: {},
            };
          }

          const interval = eachDayOfInterval({
            start: new Date(absence.start_date),
            end: new Date(absence.end_date),
          });

          interval.forEach((day) => {
            processedData[employeeId].absences[getDate(day)] = {
              type: absence.type,
              start_date: absence.start_date,
              end_date: absence.end_date,
            };
          });
        });
      }
      setEmployeeData(processedData);
      setLoading(false);
    };
    fetchAndProcessData();
  }, [month]);

  const handlePrevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const handleNextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const employeeIds = Object.keys(employeeData);

  return (
    <div className="p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-semibold">{format(month, "MMMM yyyy", { locale: de })}</h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Mitarbeiter</TableHead>{daysArray.map(day => <TableHead key={day} className="text-center">{day}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-card z-10"><Skeleton className="h-6 w-32" /></TableCell>{daysArray.map(day => <TableCell key={day}><Skeleton className="h-6 w-6 mx-auto" /></TableCell>)}
                </TableRow>
              ))
            ) : employeeIds.length === 0 ? (
              <TableRow><TableCell colSpan={daysInMonth + 1} className="text-center text-muted-foreground h-24">
                Keine Abwesenheiten für diesen Monat erfasst.
              </TableCell></TableRow>
            ) : (
              employeeIds.map(id => (
                <TableRow key={id}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10">{employeeData[id].name}</TableCell>{daysArray.map(day => {
                    const absenceEntry = employeeData[id].absences[day];
                    return (
                      <TableCell key={day} className="p-0 text-center">
                        {absenceEntry ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "w-full h-10 flex flex-col items-center justify-center p-1 rounded-md",
                                  typeColors[absenceEntry.type] || 'bg-muted'
                                )}>
                                  <span className="font-semibold text-xs leading-tight">{typeTranslations[absenceEntry.type] || absenceEntry.type}</span>
                                </div>
                              </TooltipTrigger>
                                <TooltipContent>
                                  <p>{typeTranslations[absenceEntry.type] || absenceEntry.type}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(absenceEntry.start_date), 'dd.MM.yyyy', { locale: de })} - {format(new Date(absenceEntry.end_date), 'dd.MM.yyyy', { locale: de })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className="w-full h-10"></div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {Object.entries(typeTranslations).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${typeColors[key]}`}></div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
  );
}