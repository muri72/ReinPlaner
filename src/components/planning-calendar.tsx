"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { PlanningData, UnassignedOrder } from "@/app/dashboard/planning/actions";
import { EmployeeWorkloadBar } from "./employee-workload-bar";
import { AssignmentCard } from "./assignment-card";
import { DraggableOrderCard } from "./draggable-order-card";
import { EmployeeEditDialog } from "./employee-edit-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const absenceTypeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const absenceTypeColors: { [key: string]: string } = {
  vacation: "bg-blue-500",
  sick_leave: "bg-yellow-500",
  training: "bg-purple-500",
  other: "bg-gray-500",
};

function DroppableCell({ id, children, isOver, isAvailable }: { id: string; children: React.ReactNode; isOver: boolean; isAvailable: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <TableCell
      ref={setNodeRef}
      className={cn(
        "p-1 border h-24 align-top",
        isOver && "bg-primary/20 ring-2 ring-primary",
        !isAvailable && "bg-muted/50 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,hsl(var(--border))_4px,hsl(var(--border))_5px)]"
      )}
    >
      <div className="h-full w-full">{children}</div>
    </TableCell>
  );
}

interface PlanningCalendarProps {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  weekDays: Date[];
  activeDragId: string | null;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  weekNumber: number;
}

export function PlanningCalendar({ planningData, unassignedOrders, weekDays, activeDragId, showUnassigned, onActionSuccess, weekNumber }: PlanningCalendarProps) {
  const employeeIds = Object.keys(planningData);

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar">
      <Table className="min-w-full border-collapse table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-20 w-[250px] text-sm" rowSpan={2}>Mitarbeiter</TableHead>
            <TableHead colSpan={weekDays.length} className="text-center text-sm font-semibold border-b">
              Woche {weekNumber}
            </TableHead>
          </TableRow>
          <TableRow>
            {weekDays.map((day) => (
              <TableHead key={day.toString()} className="text-center text-sm w-[120px] min-w-[120px]">
                {format(day, "E dd.", { locale: de })}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Unassigned Orders Row */}
          {showUnassigned && (
            <TableRow>
              <TableCell className="font-semibold sticky left-0 bg-card z-10 align-top">
                Unbesetzte Einsätze
              </TableCell>
              {weekDays.map((day) => {
                const dateString = format(day, "yyyy-MM-dd");
                const ordersForDay = unassignedOrders.filter(
                  (order) => order.due_date && format(parseISO(order.due_date), "yyyy-MM-dd") === dateString
                );
                const droppableId = `unassigned__${dateString}`;
                return (
                  <DroppableCell
                    key={dateString}
                    id={droppableId}
                    isOver={activeDragId !== null && droppableId === (activeDragId as string)}
                    isAvailable={true}
                  >
                    <div className="space-y-1">
                      {ordersForDay.map((order) => (
                        <DraggableOrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </DroppableCell>
                );
              })}
            </TableRow>
          )}

          {/* Employee Rows */}
          {employeeIds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={weekDays.length + 1} className="text-center text-muted-foreground h-24">
                Keine Mitarbeiter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            employeeIds.map(id => {
              const employee = planningData[id];
              if (!employee) return null;
              const available = employee.totalHoursAvailable - employee.totalHoursPlanned;
              return (
                <TableRow key={id}>
                  <TableCell className="font-normal sticky left-0 bg-card z-10 align-top p-2 w-[250px]">
                    <div className="flex items-start gap-2">
                      <Avatar>
                        <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <EmployeeEditDialog employee={employee.raw as any} onEmployeeUpdated={onActionSuccess}>
                          <div className="text-sm font-semibold cursor-pointer hover:text-primary">{employee.name}</div>
                        </EmployeeEditDialog>
                        <p className="text-xs text-muted-foreground">{employee.raw.job_title || 'Mitarbeiter'}</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-2">
                                <EmployeeWorkloadBar
                                  planned={employee.totalHoursPlanned}
                                  available={employee.totalHoursAvailable}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm space-y-1">
                                <p>Eingeplant (Woche): {employee.totalHoursPlanned.toFixed(2)}h</p>
                                <p>Verfügbar (Woche): {employee.totalHoursAvailable.toFixed(2)}h</p>
                                <p>Noch verfügbar: {available.toFixed(2)}h</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </TableCell>
                  {weekDays.map((day) => {
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
                                <div className={cn(
                                  "w-full h-full flex items-center justify-center font-semibold text-xs sm:text-sm text-white",
                                  absenceTypeColors[dayData.absenceType || 'other']
                                )}>
                                  {absenceTypeTranslations[dayData.absenceType || 'other']}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent><p>{absenceTypeTranslations[dayData.absenceType || 'other']}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    }

                    return (
                      <DroppableCell
                        key={dateString}
                        id={droppableId}
                        isOver={activeDragId !== null && droppableId === (activeDragId as string)}
                        isAvailable={dayData.isAvailable || dayData.assignments.length > 0}
                      >
                        <div className="space-y-1">
                          {dayData.assignments.map((assignment) => (
                            <AssignmentCard key={assignment.id} assignment={assignment} onSuccess={onActionSuccess} />
                          ))}
                        </div>
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
  );
}