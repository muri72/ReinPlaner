"use client";

import React from "react";
import { UseFormReturn, Controller, useFieldArray } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectEmployees } from "@/components/multi-select-employees";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { dayNames, germanDayNames, AssignedEmployee, OrderFormValues } from "../order-form";
import { X, Copy } from "lucide-react";

// Type for field array items returned by useFieldArray
type AssignedEmployeeField = {
  id: string;
} & AssignedEmployee;

interface OrderAssignmentsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  allEmployees: { id: string; first_name: string; last_name: string }[];
  selectedObjectId: string | undefined | null;
  objects: any[];
  onEmployeeSelectionChange: (selectedIds: string[]) => void;
  handleAssignedDailyHoursChange: (
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => void;
  handleAssignedStartTimeChange: (
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => void;
  handleAssignedEndTimeChange: (
    employeeIndex: number,
    weekIndex: number,
    day: typeof dayNames[number],
    value: string
  ) => void;
  handleCopyDayToOtherDaysInSameWeek: (
    employeeIndex: number,
    weekIndex: number,
    sourceDay: typeof dayNames[number]
  ) => void;
  recalculateTotalHours: () => void;
}

export function OrderAssignmentsSection({
  form,
  allEmployees,
  selectedObjectId,
  objects,
  onEmployeeSelectionChange,
  handleAssignedDailyHoursChange,
  handleAssignedStartTimeChange,
  handleAssignedEndTimeChange,
  handleCopyDayToOtherDaysInSameWeek,
  recalculateTotalHours,
}: OrderAssignmentsSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields: assignedEmployeeFields } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  }) as any;

  const getObjectDailyHours = (weekIndex: number, day: typeof dayNames[number]): number | null => {
    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    return (selectedObject?.daily_schedules?.[weekIndex] as any)?.[day]?.hours || null;
  };

  const getSumAssignedHoursForDay = (weekIndex: number, day: typeof dayNames[number]): number => {
    const currentAssignments = (form.watch("assignedEmployees") ?? []) as AssignedEmployee[];
    const sum = currentAssignments.reduce((total: number, emp: AssignedEmployee) => {
      const assignedHours = (emp.assigned_daily_schedules?.[weekIndex] as any)?.[day]?.hours;
      const num = typeof assignedHours === 'number' ? assignedHours : Number(assignedHours ?? 0);
      return total + (isNaN(num) ? 0 : num);
    }, 0);
    return typeof sum === 'number' && !isNaN(sum) ? sum : 0;
  };

  const isDailyHoursValid = (weekIndex: number, day: typeof dayNames[number]): boolean => {
    const objectHours = getObjectDailyHours(weekIndex, day);
    if (objectHours === null || objectHours === 0) return true;
    const sumAssigned = getSumAssignedHoursForDay(weekIndex, day);
    return sumAssigned <= objectHours + 0.1;
  };

  return (
    <div className="space-y-4">
      <Label>Zugewiesene Mitarbeiter (optional)</Label>
      <MultiSelectEmployees
        employees={allEmployees}
        selectedEmployeeIds={assignedEmployeeFields.map((emp: any) => emp.employeeId)}
        onSelectionChange={onEmployeeSelectionChange}
        disabled={!selectedObjectId}
      />
      {form.formState.errors.assignedEmployees && (
        <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.assignedEmployees.message)}</p>
      )}
      {!selectedObjectId && (
        <p className="text-muted-foreground text-sm mt-1">Bitte wählen Sie zuerst ein Objekt aus, um Mitarbeiter zuzuweisen.</p>
      )}

      {assignedEmployeeFields.length > 0 && (
        <div className="mt-4 space-y-4">
          <h3 className="text-lg font-semibold">Arbeitszeiten pro Mitarbeiter</h3>
          {(form.formState.errors as any).assignedEmployees && <p className="text-red-500 text-sm mt-1">{(form.formState.errors as any).assignedEmployees.message}</p>}
          {assignedEmployeeFields.map((assignedEmp: any, assignedIndex: number) => (
            <div key={assignedEmp.employeeId} className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-base">
                  {allEmployees.find(emp => emp.id === assignedEmp.employeeId)?.first_name}{' '}
                  {allEmployees.find(emp => emp.id === assignedEmp.employeeId)?.last_name}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newSelectedIds = assignedEmployeeFields.filter((emp: any) => emp.employeeId !== assignedEmp.employeeId).map((emp: any) => emp.employeeId);
                    onEmployeeSelectionChange(newSelectedIds);
                  }}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Wiederholungsintervall für Mitarbeiter</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`}>Zyklus</Label>
                    <Select
                      onValueChange={(value: string) => {
                        form.setValue(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`, parseInt(value), { shouldValidate: true });
                        const currentOffsetRaw = form.getValues(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`);
                        const currentOffset = typeof currentOffsetRaw === 'number' ? currentOffsetRaw : 0;
                        if (currentOffset >= parseInt(value)) {
                          form.setValue(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`, 0, { shouldValidate: true });
                        }
                      }}
                      value={String(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Zyklus auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Woche (wöchentlich)</SelectItem>
                        <SelectItem value="2">2 Wochen (alle 2 Wochen)</SelectItem>
                        <SelectItem value="4">4 Wochen (monatlich)</SelectItem>
                        <SelectItem value="8">8 Wochen (alle 2 Monate)</SelectItem>
                        <SelectItem value="12">12 Wochen (quartalsweise)</SelectItem>
                        <SelectItem value="26">26 Wochen (halbjährlich)</SelectItem>
                        <SelectItem value="52">52 Wochen (jährlich)</SelectItem>
                      </SelectContent>
                    </Select>
                    {((form.formState.errors.assignedEmployees as any)?.[assignedIndex])?.assigned_recurrence_interval_weeks && <p className="text-red-500 text-sm mt-1">{((form.formState.errors.assignedEmployees as any)?.[assignedIndex])?.assigned_recurrence_interval_weeks?.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Wie oft arbeitet dieser Mitarbeiter hier?
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}>Start in</Label>
                    <Controller
                      name={`assignedEmployees.${assignedIndex}.assigned_start_week_offset`}
                      control={form.control}
                      defaultValue={0}
                      render={({ field }) => (
                        <Select
                          onValueChange={(value: string) => field.onChange(parseInt(value))}
                          value={String(field.value ?? 0)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Start auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1) }, (_, i) => {
                              const weekNum = i + 1;
                              const label = weekNum === 1
                                ? "Erste Woche"
                                : weekNum === 2
                                  ? "Zweite Woche"
                                  : weekNum === 3
                                    ? "Dritte Woche"
                                    : weekNum === 4
                                      ? "Vierte Woche"
                                      : `Woche ${weekNum}`;
                              return (
                                <SelectItem key={i} value={String(i)}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Zyklus startet in dieser Woche
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Definiert, in welchem Wochenintervall die untenstehenden Arbeitszeiten für diesen Mitarbeiter gelten.
                  Ein Intervall von 1 bedeutet jede Woche. Ein Intervall von 2 mit Offset 0 bedeutet jede zweite Woche, beginnend mit der aktuellen Woche.
                </p>
              </div>

              {(assignedEmp.assigned_daily_schedules ?? []).map((weekSchedule: any, weekIndex: number) => (
                <div key={weekIndex} className="border p-3 rounded-md space-y-2 bg-background/50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">
                      Woche {weekIndex + 1} (Offset {
                        ((Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_start_week_offset`) ?? 0) + weekIndex) %
                          (Number(form.watch(`assignedEmployees.${assignedIndex}.assigned_recurrence_interval_weeks`) ?? 1)))
                      })
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {dayNames.map((day: any) => {
                      const hoursFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.hours` as const;
                      const startFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.start` as const;
                      const endFieldName = `assignedEmployees.${assignedIndex}.assigned_daily_schedules.${weekIndex}.${day}.end` as const;
                      const objectDailyHours = getObjectDailyHours(weekIndex, day);
                      const isDayValid = isDailyHoursValid(weekIndex, day);

                      if (!objectDailyHours || objectDailyHours === 0) return null;

                      return (
                        <div key={day} className={cn(
                          "border p-3 rounded-md space-y-2",
                          !isDayValid && "border-destructive bg-destructive/5"
                        )}>
                          <h6 className="font-medium text-xs flex items-center justify-between">
                            {germanDayNames[day]}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-primary"
                                    onClick={() => handleCopyDayToOtherDaysInSameWeek(assignedIndex, weekIndex, day)}
                                    disabled={(!form.watch(hoursFieldName) && !form.watch(startFieldName) && !form.watch(endFieldName))}
                                    title="Auf andere Tage in dieser Woche kopieren"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Zeiten für diesen Tag auf andere Tage in derselben Woche kopieren</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </h6>
                          <Controller
                            name={hoursFieldName}
                            control={form.control}
                            render={({ field }) => (
                              <div>
                                <Label htmlFor={field.name} className="text-xs">Arbeitsstunden</Label>
                                <Input
                                  {...field}
                                  id={field.name}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={objectDailyHours ?? undefined}
                                  placeholder="Std."
                                  className={cn(
                                    "w-full text-sm",
                                    !isDayValid && "border-destructive focus-visible:ring-destructive"
                                  )}
                                  value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
                                  onChange={(e) => {
                                    field.onChange(e.target.value === '' ? null : Number(e.target.value));
                                    handleAssignedDailyHoursChange(assignedIndex, weekIndex, day, e.target.value);
                                    recalculateTotalHours();
                                  }}
                                />
                              </div>
                            )}
                          />
                          <Controller
                            name={startFieldName}
                            control={form.control}
                            render={({ field }) => (
                              <div>
                                <Label htmlFor={field.name} className="text-xs">Startzeit</Label>
                                <Input
                                  {...field}
                                  id={field.name}
                                  type="time"
                                  className="w-full text-sm"
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleAssignedStartTimeChange(assignedIndex, weekIndex, day, e.target.value);
                                    recalculateTotalHours();
                                  }}
                                />
                              </div>
                            )}
                          />
                          <Controller
                            name={endFieldName}
                            control={form.control}
                            render={({ field }) => (
                              <div>
                                <Label htmlFor={field.name} className="text-xs">Endzeit</Label>
                                <Input
                                  {...field}
                                  id={field.name}
                                  type="time"
                                  className="w-full text-sm"
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleAssignedEndTimeChange(assignedIndex, weekIndex, day, e.target.value);
                                    recalculateTotalHours();
                                  }}
                                />
                              </div>
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {!isDailyHoursValid(weekIndex, 'monday') && getObjectDailyHours(weekIndex, 'monday') && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                      ⚠️ Die Summe der zugewiesenen Stunden für jeden Tag in dieser Woche muss den Objektstunden entsprechen.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {selectedObjectId && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Objektarbeitszeiten Übersicht</h4>
              {objects.find(obj => obj.id === selectedObjectId)?.daily_schedules?.map((objectWeekSchedule: any, weekIndex: number) => (
                <div key={weekIndex} className="mb-2">
                  <h5 className="font-semibold text-sm">Woche {weekIndex + 1}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {dayNames.map(day => {
                      const objectDayHours = Number(objectWeekSchedule?.[day]?.hours) || 0;
                      const totalAssigned = getSumAssignedHoursForDay(weekIndex, day);

                      if (!objectDayHours || objectDayHours === 0) return null;

                      return (
                        <div key={day} className="flex justify-between">
                          <span>{germanDayNames[day]}:</span>
                          <span className={cn(
                            "font-medium",
                            Math.abs(totalAssigned - objectDayHours) > 0.1 ? 'text-destructive' : 'text-success'
                          )}>
                            {totalAssigned.toFixed(2)}h / {objectDayHours.toFixed(2)}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
