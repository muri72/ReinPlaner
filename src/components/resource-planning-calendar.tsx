"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { getPlanningDataForWeek, PlanningPageData, UnassignedOrder } from "@/lib/actions/planning";
import { assignOrderToEmployee } from "@/app/dashboard/planning/actions";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";

const absenceTypeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const absenceTypeColors: { [key: string]: string } = {
  vacation: "bg-primary text-primary-foreground",
  sick_leave: "bg-warning text-warning-foreground",
  training: "bg-accent text-accent-foreground",
  other: "bg-muted text-muted-foreground",
};

function DraggableOrder({ order }: { order: UnassignedOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("mb-2 p-2 cursor-grab touch-none shadow-neumorphic glassmorphism-card", isDragging && "shadow-lg z-50 opacity-75")}
    >
      <CardContent className="p-0"> {/* Adjusted padding */}
        <div className="flex items-center">
          <div {...listeners} {...attributes} className="p-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-sm">{order.title}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{order.service_type || 'Allgemein'}</span>
              <span>{order.total_estimated_hours ? `${order.total_estimated_hours}h` : ''}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DroppableCell({ id, children, isOver }: { id: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <TableCell ref={setNodeRef} className={cn("p-0 text-center", isOver && "bg-primary/20")}>
      {children}
    </TableCell>
  );
}

export function ResourcePlanningCalendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getPlanningDataForWeek(currentDate);
      if (result.success) {
        setPlanningPageData(result.data);
      } else {
        toast.error(result.message);
        console.error(result.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentDate]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const orderId = active.id as string;
      const [employeeId, dateString] = (over.id as string).split('__');

      if (employeeId && dateString) {
        toast.info(`Weise Auftrag zu...`);
        const result = await assignOrderToEmployee(orderId, employeeId, dateString);
        if (result.success) {
          toast.success(result.message);
          // Re-fetch data after assignment
          const fetchResult = await getPlanningDataForWeek(currentDate);
          if (fetchResult.success) setPlanningPageData(fetchResult.data);
        } else {
          toast.error(result.message);
        }
      }
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const employeeIds = planningPageData ? Object.keys(planningPageData.planningData) : [];

  const getWorkloadColor = (hours: number) => {
    if (hours >= 8) return "bg-destructive/50";
    if (hours >= 6) return "bg-warning/50";
    if (hours > 0) return "bg-success/50";
    return "bg-transparent";
  };

  return (
    <DndContext onDragStart={({ active }) => setActiveId(active.id as string)} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-4"> {/* Changed to flex-col on mobile */}
        <div className="w-full md:w-1/4"> {/* Adjusted width */}
          <Card className="h-full shadow-neumorphic glassmorphism-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ungeplante Aufträge</CardTitle>
              <CardDescription className="text-sm">Ziehen Sie Aufträge auf den Kalender, um sie zuzuweisen.</CardDescription>
            </CardHeader>
            <CardContent className="h-[40vh] md:h-[60vh] overflow-y-auto p-4"> {/* Adjusted height and padding */}
              {loading ? (
                <>
                  <Skeleton className="h-20 w-full mb-2" />
                  <Skeleton className="h-20 w-full mb-2" />
                  <Skeleton className="h-20 w-full mb-2" />
                </>
              ) : planningPageData?.unassignedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center mt-8">
                  Keine ungeplanten Aufträge.
                </p>
              ) : (
                planningPageData?.unassignedOrders.map((order) => (
                  <DraggableOrder key={order.id} order={order} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-3/4"> {/* Adjusted width */}
          <div className="p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="text-base sm:text-xl font-semibold text-center"> {/* Adjusted font size */}
                {format(weekStart, "dd. MMM", { locale: de })} - {format(weekEnd, "dd. MMM yyyy", { locale: de })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[120px] sm:min-w-[200px] text-xs sm:text-sm">Mitarbeiter</TableHead>{weekDays.map((day: Date) => (
                      <TableHead key={day.toString()} className="text-center text-xs sm:text-sm"> {/* Adjusted font size */}
                        {format(day, "E dd.", { locale: de })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="sticky left-0 bg-card z-10"><Skeleton className="h-12 w-32" /></TableCell>{weekDays.map((day: Date) => <TableCell key={day.toString()}><Skeleton className="h-12 w-16 mx-auto" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : employeeIds.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground h-24 text-sm">Keine Mitarbeiterdaten gefunden.</TableCell></TableRow>
                  ) : (
                    employeeIds.map(id => {
                      const employee = planningPageData!.planningData[id];
                      return (
                        <TableRow key={id}>
                          <TableCell className="font-normal sticky left-0 bg-card z-10 text-xs sm:text-sm">{employee.name}</TableCell>{weekDays.map((day: Date) => {
                            const dateString = format(day, "yyyy-MM-dd");
                            const dayData = employee.schedule[dateString];
                            const droppableId = `${id}__${dateString}`;

                            if (!dayData) return <TableCell key={dateString}></TableCell>;

                            if (dayData.isAbsence) {
                              return (
                                <TableCell key={dateString} className="p-0">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={cn("w-full h-16 flex items-center justify-center font-semibold text-xs sm:text-sm", absenceTypeColors[dayData.absenceType || 'other'])}>
                                          {absenceTypeTranslations[dayData.absenceType || 'other']?.charAt(0)}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-sm">{absenceTypeTranslations[dayData.absenceType || 'other']}</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              );
                            }

                            return (
                              <DroppableCell key={dateString} id={droppableId} isOver={activeId !== null && droppableId === (activeId as string)}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={cn("w-full h-16 flex flex-col items-center justify-center", getWorkloadColor(dayData.totalHours))}>
                                        <span className="font-semibold text-xs sm:text-sm">{dayData.totalHours > 0 ? `${dayData.totalHours.toFixed(1)}h` : '-'}</span>
                                      </div>
                                    </TooltipTrigger>
                                    {dayData.assignments.length > 0 && (
                                      <TooltipContent>
                                        <ul className="text-sm">{dayData.assignments.map((a, i) => (<li key={i}>{a.title} ({a.hours.toFixed(1)}h)</li>))}</ul>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </DroppableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm"> {/* Adjusted font size */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-success/50"></div>
                <span>0-5.9 Stunden</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-warning/50"></div>
                <span>6-7.9 Stunden</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-destructive/50"></div>
                <span>&ge; 8 Stunden</span>
              </div>
              {Object.entries(absenceTypeTranslations).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${absenceTypeColors[key]}`}></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}