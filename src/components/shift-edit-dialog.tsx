"use client";

import * as React from "react";
import { Calendar, Clock, Users, Repeat, Trash2, Copy, Edit3, Check, Save, X, ChevronsUpDown, Layers, MapPin, User, Coffee, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ShiftAssignment, deleteShift, deleteSeries, SeriesDeleteMode, copyAssignment, copyShift, updateShift, addEmployeeToShift, removeEmployeeFromShift, reassignShift } from "@/lib/actions/shift-planning";
import { toast } from "sonner";
import {
  ShiftActions,
  ActionType,
  SeriesEditMode,
} from "@/components/shift-dialogs";

interface ShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftAssignment | null;
  onSuccess: () => void;
  availableEmployees?: { id: string; name: string }[];
  onMoveToDate?: (date: string) => void;
  onMoveToEmployee?: (employeeId: string, currentDate: string, newDate?: string) => void;
}

type ShiftStatus = ShiftAssignment['status'];

export function ShiftEditDialog({
  open,
  onOpenChange,
  shift,
  onSuccess,
  availableEmployees = [],
}: ShiftEditDialogProps) {
  const [action, setAction] = React.useState<ActionType>("edit");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState<SeriesDeleteMode>("single");
  const [editMode, setEditMode] = React.useState<SeriesEditMode>("single");
  const [copyMode, setCopyMode] = React.useState<"single" | "series">("single");
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null);
  const [copying, setCopying] = React.useState(false);

  // Edit form state
  const [startTime, setStartTime] = React.useState("08:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [hours, setHours] = React.useState(8);
  const [travelTime, setTravelTime] = React.useState<number | "">("");
  const [breakTime, setBreakTime] = React.useState<number | "">("");
  type ShiftStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
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
      setEditMode("single");
      setCopyMode("single");
      setSelectedEmployee(null);
      setCopyDate("");
      setCopySeriesStartDate("");
      setStartTime(shift.start_time?.slice(0, 5) || "08:00");
      setEndTime(shift.end_time?.slice(0, 5) || "17:00");
      setHours(shift.estimated_hours || 8);
      setTravelTime(shift.travel_time_minutes || "");
      setBreakTime(shift.break_time_minutes || "");
      setStatus((shift.status as ShiftStatus) || "scheduled");
      setIsTeamMode(shift.is_team || false);
      setAssignedEmployeeIds(shift.employees.map((e: any) => e.employee_id));
      setEditEmployeeId(shift.employees[0]?.employee_id || null);
    }
  }, [open, shift?.id]);

  if (!shift) return null;

  const formattedDate = format(parseISO(shift.shift_date), "EEEE, d. MMMM yyyy", { locale: de });

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const isTrulyRecurring = shift.is_recurring && !shift.is_detached_from_series && !!shift.assignment_id;

      let result;

      if (isTrulyRecurring) {
        if (deleteMode === "single") {
          result = await deleteSeries(shift.assignment_id!, "single", shift.shift_date);
        } else if (deleteMode === "future") {
          result = await deleteSeries(shift.assignment_id!, "future", shift.shift_date);
        } else {
          result = await deleteSeries(shift.assignment_id!, "all", shift.shift_date);
        }
      } else {
        result = await deleteShift(shift.id, shift.shift_date, "Einsatz gelöscht");
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
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

    if (copyMode === "single" && !copyDate) {
      toast.error("Bitte wählen Sie ein Zieldatum aus");
      return;
    }

    setCopying(true);

    try {
      let result;

      if (copyMode === "single") {
        result = await copyShift({
          sourceShiftId: shift.id,
          newEmployeeId: selectedEmployee,
          newDate: copyDate,
          newStartTime: shift.start_time || undefined,
          newEndTime: shift.end_time || undefined,
        });
      } else {
        if (!shift.assignment_id) {
          toast.error("Keine Zuweisungs-ID gefunden für Serienkopie");
          setCopying(false);
          return;
        }
        const seriesStartDate = copySeriesStartDate || shift.shift_date;
        result = await copyShift({ sourceShiftId: shift.assignment_id, newEmployeeId: selectedEmployee, newDate: seriesStartDate });
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
    setSaving(true);

    try {
      const currentEmployeeIds = shift.employees.map((e: any) => e.employee_id);
      const employeesToAdd = assignedEmployeeIds.filter((id: string) => !currentEmployeeIds.includes(id));
      const employeesToRemove = currentEmployeeIds.filter((id: string) => !assignedEmployeeIds.includes(id));

      if (isTeamMode && employeesToAdd.length > 0) {
        for (const empId of employeesToAdd) {
          const addResult = await addEmployeeToShift(shift.id, empId);
          if (!addResult.success) {
            toast.warning(`Mitarbeiter konnte nicht hinzugefügt werden: ${addResult.message}`);
          }
        }
      }

      if (isTeamMode && employeesToRemove.length > 0) {
        for (const empId of employeesToRemove) {
          const removeResult = await removeEmployeeFromShift(shift.id, empId);
          if (!removeResult.success) {
            toast.warning(`Mitarbeiter konnte nicht entfernt werden: ${removeResult.message}`);
          }
        }
      }

      const currentWorker = shift.employees.find((e: any) => e.role === "worker");
      const currentEmployeeId = currentWorker?.employee_id;

      let employeeChanged = false;
      let reassignMessage = "";
      if (!isTeamMode && editEmployeeId && editEmployeeId !== currentEmployeeId) {
        employeeChanged = true;
        const reassignMode = editMode === "series" ? "future" : "single";
        const reassignResult = await reassignShift(shift.id, editEmployeeId);

        if (!reassignResult.success) {
          toast.error(reassignResult.message || "Fehler beim Ändern des Mitarbeiters");
          setSaving(false);
          return;
        }
        reassignMessage = reassignResult.message;
      }

      // Regenerate time entries for completed shifts
      if (status === "completed") {
        const { deleteTimeEntriesForShiftAndEmployee, generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
        if (currentEmployeeId) {
          await deleteTimeEntriesForShiftAndEmployee(shift.id, currentEmployeeId);
        }
        await generateTimeEntriesForShift(shift.id);
      }

      const isTrulyRecurring = shift.is_recurring && !shift.is_detached_from_series && !!shift.assignment_id;

      let result;
      if (isTrulyRecurring && editMode === "series") {
        result = await updateShift(shift.id, {
          start_time: startTime,
          end_time: endTime,
          estimated_hours: hours,
          travel_time_minutes: travelTime === "" ? 0 : travelTime,
          break_time_minutes: breakTime === "" ? 0 : breakTime,
          status,
          update_mode: "series",
        });
      } else {
        result = await updateShift(shift.id, {
          start_time: startTime,
          end_time: endTime,
          estimated_hours: hours,
          travel_time_minutes: travelTime === "" ? 0 : travelTime,
          break_time_minutes: breakTime === "" ? 0 : breakTime,
          status,
          update_mode: "single",
        });
      }

      if (result.success) {
        if (employeeChanged && reassignMessage) {
          toast.success(`${reassignMessage} ${result.message}`);
        } else {
          toast.success(result.message);
        }
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

  const getEmployeeName = (id: string) => {
    const emp = availableEmployees.find(e => e.id === id);
    return emp?.name || "Unbekannt";
  };

  const handleEmployeeSelect = (employeeId: string) => {
    if (assignedEmployeeIds.includes(employeeId)) {
      setAssignedEmployeeIds(prev => prev.filter((id: string) => id !== employeeId));
    } else {
      setAssignedEmployeeIds(prev => [...prev, employeeId]);
    }
  };

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={shift.job_title}
      description={`${formattedDate} | ${startTime} - ${endTime} (${hours.toFixed(2)} Std.)`}
      icon={<Calendar className="h-5 w-5" />}
      className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 glassmorphism-card"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving || deleting || copying}
          >
            Abbrechen
          </Button>
          {action === "edit" && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting || copying}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          )}
          {action === "copy" && (
            <Button
              type="button"
              onClick={handleCopy}
              disabled={saving || deleting || copying}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copying ? "Kopieren..." : "Kopieren"}
            </Button>
          )}
          {action === "delete" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || deleting || copying}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Löschen..." : "Löschen"}
            </Button>
          )}
        </div>
      }
    >
      {/* Header Info - moved into content area */}
      <div className="space-y-3">
        {/* Time & Hours Info */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{startTime} - {endTime} ({hours.toFixed(2)} Std.)</span>
          {(shift.travel_time_minutes || shift.break_time_minutes) && (
            <span className="text-xs">
              {(shift.travel_time_minutes || 0) > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Car className="h-3 w-3" />
                  {shift.travel_time_minutes}m
                </span>
              )}
              {(shift.break_time_minutes || 0) > 0 && (
                <span className="inline-flex items-center gap-0.5 ml-2">
                  <Coffee className="h-3 w-3" />
                  {shift.break_time_minutes}m
                </span>
              )}
            </span>
          )}
        </div>
        {/* Address */}
        {(shift.object_address || shift.object_name) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {shift.object_address ? (
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(shift.object_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline transition-colors"
                onClick={(e) => {
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile && shift.object_address) {
                    window.location.href = `maps:0,0?q=${encodeURIComponent(shift.object_address)}`;
                    e.preventDefault();
                  }
                }}
              >
                {shift.object_address}
              </a>
            ) : (
              <span>{shift.object_name}</span>
            )}
          </div>
        )}
        {/* Team Members */}
        {shift.is_team && shift.employees.length > 1 && !shift.is_multi_shift && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{shift.employees.map((e: any) => e.employee_name).join(", ")}</span>
          </div>
        )}
        {/* Multi-Shift */}
        {shift.is_multi_shift && shift.employees.length > 1 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>{shift.employees.map((e: any) => e.employee_name).join(", ")}</span>
          </div>
        )}
        {/* Single Employee */}
        {!shift.is_team && !shift.is_multi_shift && shift.employees[0] && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{shift.employees[0].employee_name}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mt-4">
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
        {(shift.is_multi_shift || (shift.employees.length > 1 && !shift.is_team)) && (
          <Badge variant="outline" className="text-xs gap-1 border-indigo-300 text-indigo-700 bg-indigo-50">
            <Layers className="h-3 w-3" />
            Mehrschicht ({shift.employees.length})
          </Badge>
        )}
        {shift.is_team && shift.employees.length > 1 && !shift.is_multi_shift && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            Team ({shift.employees.length})
          </Badge>
        )}
      </div>

      {/* Shift Actions (Edit/Copy/Delete) */}
      <div className="mt-4">
        <ShiftActions
          action={action}
          setAction={setAction}
          shift={shift}
          formattedDate={formattedDate}
          availableEmployees={availableEmployees}
          editMode={editMode}
          setEditMode={setEditMode}
          isTeamMode={isTeamMode}
          setIsTeamMode={setIsTeamMode}
          assignedEmployeeIds={assignedEmployeeIds}
          setAssignedEmployeeIds={setAssignedEmployeeIds}
          employeeSelectOpen={employeeSelectOpen}
          setEmployeeSelectOpen={setEmployeeSelectOpen}
          editEmployeeId={editEmployeeId}
          setEditEmployeeId={setEditEmployeeId}
          startTime={startTime}
          endTime={endTime}
          hours={hours}
          travelTime={travelTime}
          breakTime={breakTime}
          status={status}
          saving={saving}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          setHours={setHours}
          setTravelTime={setTravelTime}
          setBreakTime={setBreakTime}
          setStatus={setStatus}
          copyMode={copyMode}
          setCopyMode={setCopyMode}
          copyDate={copyDate}
          setCopyDate={setCopyDate}
          copySeriesStartDate={copySeriesStartDate}
          setCopySeriesStartDate={setCopySeriesStartDate}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
          copying={copying}
          deleteMode={deleteMode}
          setDeleteMode={setDeleteMode}
          deleting={deleting}
          handleSave={handleSave}
          handleCopy={handleCopy}
          handleDelete={handleDelete}
          getEmployeeName={getEmployeeName}
          handleEmployeeSelect={handleEmployeeSelect}
        />
      </div>
    </RecordDialog>
  );
}
