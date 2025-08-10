"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { getPlanningDataForWeek, PlanningData } from "@/lib/actions/planning";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const absenceTypeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const absenceTypeColors: { [key: string]: string } = {
  vacation: "bg-blue-500 text-white",
  sick_leave: "bg-yellow-500 text-white",
  training: "bg-green-500 text-white",
  other: "bg-gray-500 text-white",
};

export function ResourcePlanningCalendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [planningData, setPlanningData] = React.useState<PlanningData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getPlanningDataForWeek(currentDate);
      if (result.success) {
        setPlanningData(result.data);
      } else {
        // Handle error, maybe show a toast
        console.error(result.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentDate]);

  const handlePrevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const employeeIds = planningData ? Object.keys(planningData) : [];

  const getWorkloadColor = (hours: number) => {
    if (hours > 8) return "bg-red-200 dark:bg-red-900";
    if (hours > 6) return "bg-yellow-200 dark:bg-yellow-900";
    if (hours > 0) return "bg-green-200 dark:bg-green-900";
    return "bg-transparent";
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-semibold">
          {format(weekStart, "dd. MMM", { locale: de })} - {format(weekEnd, "dd. MMM yyyy", { locale: de })}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Mitarbeiter</TableHead>
              {weekDays.map(day => (
                <TableHead key={day.toString()} className="text-center">
                  {format(day, "E dd.", { locale: de })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-card z-10"><Skeleton className="h-8 w-32" /></TableCell>
                  {weekDays.map(day => <TableCell key={day.toString()}><Skeleton className="h-8 w-16 mx-auto" /></TableCell>)}
                </TableRow>
              ))
            ) : employeeIds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                  Keine Mitarbeiterdaten gefunden.
                </TableCell>
              </TableRow>
            ) : (
              employeeIds.map(id => {
                const employee = planningData![id];
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">{employee.name}</TableCell>
                    {weekDays.map(day => {
                      const dateString = format(day, "yyyy-MM-dd");
                      const dayData = employee.schedule[dateString];

                      if (!dayData) return <TableCell key={dateString}></TableCell>;

                      if (dayData.isAbsence) {
                        return (
                          <TableCell key={dateString} className="p-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn("w-full h-12 flex items-center justify-center font-semibold", absenceTypeColors[dayData.absenceType || 'other'])}>
                                    {absenceTypeTranslations[dayData.absenceType || 'other']?.charAt(0)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{absenceTypeTranslations[dayData.absenceType || 'other']}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={dateString} className={cn("text-center font-semibold p-0", getWorkloadColor(dayData.totalHours))}>
                           <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-full h-12 flex items-center justify-center">
                                    {dayData.totalHours > 0 ? `${dayData.totalHours.toFixed(2)}h` : '-'}
                                  </div>
                                </TooltipTrigger>
                                {dayData.assignments.length > 0 && (
                                  <TooltipContent>
                                    <ul>
                                      {dayData.assignments.map((a: { title: string; hours: number }, i: number) => (
                                        <li key={i}>{a.title} ({a.hours.toFixed(2)}h)</li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}