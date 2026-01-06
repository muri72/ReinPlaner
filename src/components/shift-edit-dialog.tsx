"use client";

import * as React from "react";
import { Calendar, Clock, Users, Repeat, Trash2, Copy, Edit3, ArrowRightLeft, Check, Save, UserPlus, X, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ShiftAssignment, deleteShift, deleteSeries, SeriesDeleteMode, copyAssignment, copyShift, updateShift } from "@/lib/actions/shift-planning";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftAssignment | null;
  onSuccess: () => void;
  availableEmployees?: { id: string; name: string }[];
  onMoveToDate?: (date: string) => void;
  onMoveToEmployee?: (employeeId: string, currentDate: string, newDate?: string) => void;
}

type ActionType = "edit" | "copy" | "delete" | "move";

interface ActionOption {
  id: ActionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

type SeriesDeleteModeType = SeriesDeleteMode;

type ShiftStatus = ShiftAssignment['status'];

const statusOptions: { value: ShiftStatus; label: string; color: string; bg: string }[] = [
  { value: "scheduled", label: "Geplant", color: "text-blue-700", bg: "bg-blue-100" },
  { value: "in_progress", label: "In Bearbeitung", color: "text-yellow-700", bg: "bg-yellow-100" },
  { value: "completed", label: "Abgeschlossen", color: "text-green-700", bg: "bg-green-100" },
  { value: "cancelled", label: "Abgesagt", color: "text-red-700", bg: "bg-red-100" },
  { value: "no_show", label: "Nicht erschienen", color: "text-gray-700", bg: "bg-gray-100" },
];

export function ShiftEditDialog({
  open,
  onOpenChange,
  shift,
  onSuccess,
  availableEmployees = [],
  onMoveToDate,
  onMoveToEmployee,
}: ShiftEditDialogProps) {
  const [action, setAction] = React.useState<ActionType>("edit");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState<SeriesDeleteModeType>("single");
  const [copyMode, setCopyMode] = React.useState<"single" | "series">("single");
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null);
  const [copying, setCopying] = React.useState(false);

  // Edit form state
  const [startTime, setStartTime] = React.useState("08:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [hours, setHours] = React.useState(8);
  type ShiftStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  const [status, setStatus] = React.useState<ShiftStatus>("scheduled");
  const [editEmployeeId, setEditEmployeeId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Team mode - multiple employees
  const [isTeamMode, setIsTeamMode] = React.useState(false);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = React.useState<string[]>([]);
  const [employeeSelectOpen, setEmployeeSelectOpen] = React.useState(false);
  const [copyDate, setCopyDate] = React.useState<string>("");
  const [copySeriesStartDate, setCopySeriesStartDate] = React.useState<string>("");

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && shift) {
      setAction("edit");
      setDeleteMode("single");
      setCopyMode("single");
      setSelectedEmployee(null);
      setCopyDate("");
      setCopySeriesStartDate("");
      setStartTime(shift.start_time?.slice(0, 5) || "08:00");
      setEndTime(shift.end_time?.slice(0, 5) || "17:00");
      setHours(shift.estimated_hours || 8);
      setStatus((shift.status as ShiftStatus) || "scheduled");
      setIsTeamMode(shift.is_team || false);
      setAssignedEmployeeIds(shift.employees.map(e => e.employee_id));
      setEditEmployeeId(shift.employees[0]?.employee_id || null);
    }
  }, [open, shift?.id]);

  if (!shift) return null;

  const formattedDate = format(parseISO(shift.shift_date), "EEEE, d. MMMM yyyy", { locale: de });

  const handleDelete = async () => {
    setDeleting(true);

    console.log("[DIALOG-DELETE] Starting delete:", {
      shiftId: shift.id,
      shiftDate: shift.shift_date,
      assignmentId: shift.assignment_id,
      isRecurring: shift.is_recurring,
      isDetached: shift.is_detached_from_series,
      deleteMode,
    });

    try {
      let result;

      // Check if this is a truly recurring shift that needs series handling
      // Use is_detached_from_series as the primary indicator - if detached, delete directly
      const isTrulyRecurring = shift.is_recurring && !shift.is_detached_from_series && !!shift.assignment_id;

      if (isTrulyRecurring) {
        // Use series delete for recurring shifts
        console.log("[DIALOG-DELETE] Using series delete for recurring shift");
        if (deleteMode === "single") {
          result = await deleteSeries(shift.assignment_id!, "single", shift.shift_date);
        } else if (deleteMode === "future") {
          result = await deleteSeries(shift.assignment_id!, "future", shift.shift_date);
        } else {
          result = await deleteSeries(shift.assignment_id!, "all", shift.shift_date);
        }
      } else {
        // Delete directly by shift ID (new approach) - handles:
        // - Non-recurring shifts
        // - Detached recurring shifts (is_detached_from_series = true)
        // - Shifts without assignment_id
        console.log("[DIALOG-DELETE] Using direct shift delete", {
          isRecurring: shift.is_recurring,
          isDetached: shift.is_detached_from_series,
          hasAssignmentId: !!shift.assignment_id,
        });
        result = await deleteShift(shift.id, shift.shift_date, "Einsatz gelöscht");
      }

      console.log("[DIALOG-DELETE] Result:", result);

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error("[DIALOG-DELETE] Error:", error);
      toast.error(`Fehler beim Löschen: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedEmployee) {
      toast.error("Bitte wählen Sie einen Mitarbeiter aus");
      return;
    }

    // For single copy, a target date is required
    if (copyMode === "single" && !copyDate) {
      toast.error("Bitte wählen Sie ein Zieldatum aus");
      return;
    }

    setCopying(true);

    try {
      let result;

      if (copyMode === "single") {
        // Copy single shift using copyShift (new approach)
        result = await copyShift({
          sourceShiftId: shift.id,
          newEmployeeId: selectedEmployee,
          newDate: copyDate,
          newStartTime: shift.start_time || undefined,
          newEndTime: shift.end_time || undefined,
        });
      } else {
        // Copy entire assignment/series using copyAssignment (old approach)
        if (!shift.assignment_id) {
          toast.error("Keine Zuweisungs-ID gefunden für Serienkopie");
          setCopying(false);
          return;
        }
        const seriesStartDate = copySeriesStartDate || shift.shift_date;
        result = await copyAssignment(
          shift.assignment_id,
          selectedEmployee,
          seriesStartDate,
          true
        );
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Fehler beim Kopieren: ${error.message}`);
    } finally {
      setCopying(false);
    }
  };

  const handleSave = async () => {
    if (!shift.assignment_id) {
      toast.error("Keine Zuweisungs-ID gefunden");
      return;
    }

    setSaving(true);

    try {
      // Handle team employee changes
      const currentEmployeeIds = shift.employees.map(e => e.employee_id);
      const employeesToAdd = assignedEmployeeIds.filter(id => !currentEmployeeIds.includes(id));
      const employeesToRemove = currentEmployeeIds.filter(id => !assignedEmployeeIds.includes(id));

      // Move employees if needed
      if (onMoveToEmployee && employeesToAdd.length > 0) {
        for (const empId of employeesToAdd) {
          await onMoveToEmployee(empId, shift.shift_date);
        }
      }

      // Update shift details
      const result = await updateShift(shift.assignment_id, shift.shift_date, {
        start_time: startTime,
        end_time: endTime,
        estimated_hours: hours,
        status,
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const actionOptions: ActionOption[] = [
    { id: "edit", label: "Bearbeiten", icon: Edit3 },
    { id: "move", label: "Verschieben", icon: ArrowRightLeft },
    { id: "copy", label: "Kopieren", icon: Copy },
    { id: "delete", label: "Löschen", icon: Trash2, destructive: true },
  ];

  const getEmployeeName = (id: string) => {
    const emp = availableEmployees.find(e => e.id === id);
    return emp?.name || "Unbekannt";
  };

  const handleEmployeeSelect = (employeeId: string) => {
    if (assignedEmployeeIds.includes(employeeId)) {
      setAssignedEmployeeIds(prev => prev.filter(id => id !== employeeId));
    } else {
      setAssignedEmployeeIds(prev => [...prev, employeeId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base font-medium flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="truncate">{shift.job_title}</div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{startTime} - {endTime} ({hours.toFixed(2)} Std.)</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Badges */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {shift.is_recurring && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Repeat className="h-3 w-3" />
              Serie
            </Badge>
          )}
          {shift.service_title && (
            <Badge className="text-xs" style={{ backgroundColor: shift.service_color || "#3b82f6", color: "#ffffff" }}>
              {shift.service_title}
            </Badge>
          )}
          {shift.is_team && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Team ({shift.employees.length})
            </Badge>
          )}
        </div>

        {/* Action Selection */}
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Aktion auswählen</p>
          <div className="grid grid-cols-4 gap-1.5">
            {actionOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = action === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAction(option.id)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border transition-all",
                    isSelected
                      ? option.destructive
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1", isSelected ? "text-foreground" : "text-muted-foreground")} />
                  <span className={cn("text-xs", isSelected ? "font-medium" : "text-muted-foreground")}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* EDIT ACTION */}
          {action === "edit" && (
            <div className="space-y-3">
              {/* Team Mode Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Mitarbeiterzuweisung</label>
                <button
                  type="button"
                  onClick={() => setIsTeamMode(!isTeamMode)}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    isTeamMode
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {isTeamMode ? "Team-Modus aktiv" : "Einzelzuweisung"}
                </button>
              </div>

              {isTeamMode ? (
                /* Multi-Select Employee Selection (like MultiSelectEmployees component) */
                <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSelectOpen}
                      className="w-full justify-between h-auto min-h-[36px] flex-wrap"
                    >
                      {assignedEmployeeIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedEmployeeIds.map((id) => (
                            <Badge key={id} variant="secondary" className="flex items-center gap-1">
                              {getEmployeeName(id)}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleEmployeeSelect(id);
                                }}
                              />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Mitarbeiter auswählen...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Mitarbeiter suchen..." />
                      <CommandList>
                        <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                        <CommandGroup heading="Mitarbeiter">
                          {availableEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={emp.name}
                              onSelect={() => {
                                handleEmployeeSelect(emp.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  assignedEmployeeIds.includes(emp.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {emp.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                /* Single Employee Selection with Popover */
                <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSelectOpen}
                      className="w-full justify-between"
                    >
                      {editEmployeeId ? (
                        <span>{getEmployeeName(editEmployeeId)}</span>
                      ) : (
                        <span className="text-muted-foreground">Mitarbeiter auswählen...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Mitarbeiter suchen..." />
                      <CommandList>
                        <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                        <CommandGroup heading="Mitarbeiter">
                          {availableEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={emp.name}
                              onSelect={() => {
                                setEditEmployeeId(emp.id);
                                setEmployeeSelectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editEmployeeId === emp.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {emp.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Time Fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ende</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Hours */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stunden</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {statusOptions.slice(0, 3).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-all",
                        status === opt.value
                          ? opt.bg + " " + opt.color
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {statusOptions.slice(3).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-all",
                        status === opt.value
                          ? opt.bg + " " + opt.color
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full text-sm">
                {saving ? (
                  <>Speichert...</>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          )}

          {/* MOVE ACTION */}
          {action === "move" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Datum auswählen</label>
                <input
                  type="date"
                  value={copyDate || ""}
                  onChange={(e) => setCopyDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {availableEmployees.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Zu Mitarbeiter verschieben</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedEmployee ? (
                          <span>{getEmployeeName(selectedEmployee)}</span>
                        ) : (
                          <span className="text-muted-foreground">Mitarbeiter auswählen...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Mitarbeiter suchen..." />
                        <CommandList>
                          <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                          <CommandGroup heading="Mitarbeiter">
                            {availableEmployees.map((emp) => {
                              const currentId = shift.employees[0]?.employee_id;
                              const isCurrent = emp.id === currentId;
                              return (
                                <CommandItem
                                  key={emp.id}
                                  value={emp.name}
                                  onSelect={() => {
                                    setSelectedEmployee(emp.id);
                                  }}
                                  disabled={isCurrent}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedEmployee === emp.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {emp.name}
                                  {isCurrent && <span className="ml-1 text-xs text-muted-foreground">(aktuell)</span>}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Confirm Move Button */}
              <Button
                onClick={() => {
                  if (selectedEmployee && copyDate && onMoveToEmployee) {
                    onMoveToEmployee(selectedEmployee, shift.shift_date, copyDate);
                    onOpenChange(false);
                  } else if (selectedEmployee && onMoveToEmployee) {
                    onMoveToEmployee(selectedEmployee, shift.shift_date);
                    onOpenChange(false);
                  } else if (copyDate && onMoveToDate) {
                    onMoveToDate(copyDate);
                    onOpenChange(false);
                  }
                }}
                disabled={!selectedEmployee && !copyDate}
                className="w-full text-sm"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Verschieben
              </Button>
            </div>
          )}

          {/* COPY ACTION */}
          {action === "copy" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Was kopieren?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopyMode("single")}
                    className={cn(
                      "p-2 rounded border text-center text-sm",
                      copyMode === "single" ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">Dieses Datum</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formattedDate}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyMode("series")}
                    disabled={!shift.is_recurring}
                    className={cn(
                      "p-2 rounded border text-center text-sm",
                      !shift.is_recurring && "opacity-50 cursor-not-allowed",
                      copyMode === "series" && shift.is_recurring ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">Gesamte Serie</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Alle Termine</div>
                  </button>
                </div>
              </div>

              {copyMode === "single" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Ziel-Datum</label>
                  <input
                    type="date"
                    value={copyDate}
                    onChange={(e) => setCopyDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              )}

              {copyMode === "series" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Start-Datum der Serie</label>
                  <input
                    type="date"
                    value={copySeriesStartDate}
                    onChange={(e) => setCopySeriesStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Die Serie wird ab diesem Datum kopiert
                  </p>
                </div>
              )}

              {availableEmployees.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Mitarbeiter auswählen</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedEmployee ? (
                          <span>{getEmployeeName(selectedEmployee)}</span>
                        ) : (
                          <span className="text-muted-foreground">Mitarbeiter auswählen...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Mitarbeiter suchen..." />
                        <CommandList>
                          <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                          <CommandGroup heading="Mitarbeiter">
                            {availableEmployees.map((emp) => (
                              <CommandItem
                                key={emp.id}
                                value={emp.name}
                                onSelect={() => {
                                  setSelectedEmployee(emp.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedEmployee === emp.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {emp.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Button
                onClick={handleCopy}
                disabled={!selectedEmployee || (copyMode === "single" && !copyDate) || copying}
                className="w-full text-sm"
              >
                {copying ? "Kopiert..." : "Kopieren"}
              </Button>
            </div>
          )}

          {/* DELETE ACTION */}
          {action === "delete" && (
            <div className="space-y-3">
              {shift.is_recurring && !shift.is_detached_from_series ? (
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">Wie möchten Sie löschen?</p>
                  <div className="space-y-1.5">
                    {[
                      { mode: "single", label: "Nur diesen Termin", desc: `Löscht nur ${formattedDate}` },
                      { mode: "future", label: "Alle zukünftigen", desc: "Abgeschlossene bleiben erhalten" },
                      { mode: "all", label: "Gesamte Serie", desc: "ALLE Termine werden gelöscht" },
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => setDeleteMode(opt.mode as SeriesDeleteModeType)}
                        className={cn(
                          "w-full p-2 rounded text-left text-sm",
                          deleteMode === opt.mode ? "bg-destructive/10 border border-destructive" : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-3 text-center">
                  <Trash2 className="h-5 w-5 mx-auto mb-2 text-destructive" />
                  <p className="text-sm">Einsatz wirklich löschen?</p>
                  <p className="text-xs text-muted-foreground mt-1">{shift.job_title}</p>
                </div>
              )}

              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="destructive"
                className="w-full text-sm"
              >
                {deleting ? "Löscht..." : "Löschen"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
