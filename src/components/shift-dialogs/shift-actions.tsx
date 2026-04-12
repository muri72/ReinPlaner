"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Copy, Edit3, Check, ChevronDown, ChevronUp, X, Car, Coffee, Users, Layers, ChevronsLeftRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShiftAssignment } from "@/lib/actions/shift-planning";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

type ActionType = "edit" | "copy" | "delete";
type SeriesDeleteMode = "single" | "future" | "all";
type SeriesEditMode = "single" | "series";
type ShiftStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface ShiftActionsProps {
  action: ActionType;
  setAction: (action: ActionType) => void;
  shift: ShiftAssignment;
  formattedDate: string;
  availableEmployees: { id: string; name: string }[];
  // Edit state
  editMode: SeriesEditMode;
  setEditMode: (mode: SeriesEditMode) => void;
  isTeamMode: boolean;
  setIsTeamMode: (mode: boolean) => void;
  assignedEmployeeIds: string[];
  setAssignedEmployeeIds: React.Dispatch<React.SetStateAction<string[]>>;
  employeeSelectOpen: boolean;
  setEmployeeSelectOpen: (open: boolean) => void;
  editEmployeeId: string | null;
  setEditEmployeeId: (id: string | null) => void;
  startTime: string;
  endTime: string;
  hours: number;
  travelTime: number | "";
  breakTime: number | "";
  status: ShiftStatus;
  saving: boolean;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setHours: (hours: number) => void;
  setTravelTime: (time: number | "") => void;
  setBreakTime: (time: number | "") => void;
  setStatus: (status: ShiftStatus) => void;
  // Copy state
  copyMode: "single" | "series";
  setCopyMode: (mode: "single" | "series") => void;
  copyDate: string;
  setCopyDate: (date: string) => void;
  copySeriesStartDate: string;
  setCopySeriesStartDate: (date: string) => void;
  selectedEmployee: string | null;
  setSelectedEmployee: (id: string | null) => void;
  copying: boolean;
  // Delete state
  deleteMode: SeriesDeleteMode;
  setDeleteMode: (mode: SeriesDeleteMode) => void;
  deleting: boolean;
  // Callbacks
  handleSave: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleDelete: () => Promise<void>;
  getEmployeeName: (id: string) => string;
  handleEmployeeSelect: (employeeId: string) => void;
}

const statusOptions: { value: ShiftStatus; label: string; color: string; bg: string }[] = [
  { value: "scheduled", label: "Geplant", color: "text-blue-700", bg: "bg-blue-100" },
  { value: "in_progress", label: "In Bearbeitung", color: "text-yellow-700", bg: "bg-yellow-100" },
  { value: "completed", label: "Abgeschlossen", color: "text-green-700", bg: "bg-green-100" },
  { value: "cancelled", label: "Abgesagt", color: "text-red-700", bg: "bg-red-100" },
];

const actionOptions: { id: ActionType; label: string; icon: React.ComponentType<{ className?: string }>; destructive?: boolean }[] = [
  { id: "edit", label: "Bearbeiten", icon: Edit3 },
  { id: "copy", label: "Kopieren", icon: Copy },
  { id: "delete", label: "Löschen", icon: Trash2, destructive: true },
];

export function ShiftActions({
  action,
  setAction,
  shift,
  formattedDate,
  availableEmployees,
  editMode,
  setEditMode,
  isTeamMode,
  setIsTeamMode,
  assignedEmployeeIds,
  setAssignedEmployeeIds,
  employeeSelectOpen,
  setEmployeeSelectOpen,
  editEmployeeId,
  setEditEmployeeId,
  startTime,
  endTime,
  hours,
  travelTime,
  breakTime,
  status,
  saving,
  setStartTime,
  setEndTime,
  setHours,
  setTravelTime,
  setBreakTime,
  setStatus,
  copyMode,
  setCopyMode,
  copyDate,
  setCopyDate,
  copySeriesStartDate,
  setCopySeriesStartDate,
  selectedEmployee,
  setSelectedEmployee,
  copying,
  deleteMode,
  setDeleteMode,
  deleting,
  handleSave,
  handleCopy,
  handleDelete,
  getEmployeeName,
  handleEmployeeSelect,
}: ShiftActionsProps) {
  return (
    <>
      {/* Action Selector */}
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
            {/* Info for completed shifts */}
            {shift.status === "completed" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Änderungen am abgeschlossenen Einsatz aktualisieren den Zeiteintrag automatisch.</span>
                </p>
              </div>
            )}

            {/* Edit Mode Selector for Recurring Shifts */}
            {shift.is_recurring && !shift.is_detached_from_series && (
              <div className={cn("border rounded-lg p-3 transition-all", editMode === "series" ? "border-primary/50 bg-primary/5" : "")}>
                <p className="text-xs text-muted-foreground mb-2">Was möchten Sie bearbeiten?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode("single")}
                    className={cn(
                      "p-2 rounded border text-center text-sm transition-all",
                      editMode === "single"
                        ? "border-primary bg-primary/15 ring-2 ring-primary/20"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">Dieses Datum</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formattedDate}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode("series")}
                    className={cn(
                      "p-2 rounded border text-center text-sm transition-all relative",
                      editMode === "series"
                        ? "border-primary bg-primary/15 ring-2 ring-primary/20"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">Gesamte Serie</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Alle zukünftigen Termine</div>
                  </button>
                </div>
                {editMode === "single" && (
                  <div className="flex items-start gap-2 mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded">
                    <svg className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-[11px] text-amber-700">
                      <span className="font-medium">Nur dieser Einsatz:</span> Änderungen gelten nur für {formattedDate}
                    </p>
                  </div>
                )}
                {editMode === "series" && (
                  <div className="flex items-start gap-2 mt-2.5 p-2 bg-green-50 border border-green-200 rounded">
                    <svg className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[11px] text-green-700">
                      <span className="font-medium">Gesamte Serie:</span> Änderungen gelten für diesen und alle zukünftigen Einsätze
                    </p>
                  </div>
                )}
              </div>
            )}

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

            {/* Employee Selection */}
            {isTeamMode ? (
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
                            onSelect={() => handleEmployeeSelect(emp.id)}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", assignedEmployeeIds.includes(emp.id) ? "opacity-100" : "opacity-0")}
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
                              className={cn("mr-2 h-4 w-4", editEmployeeId === emp.id ? "opacity-100" : "opacity-0")}
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

            {/* Travel Time and Break Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  Fahrtzeit (min)
                </label>
                <input
                  type="number"
                  value={travelTime}
                  onChange={(e) => setTravelTime(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  min="0"
                  max="480"
                  placeholder="-"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Coffee className="h-3 w-3" />
                  Pause (min)
                </label>
                <input
                  type="number"
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  min="0"
                  max="480"
                  placeholder="-"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
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
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Speichern
                </>
              )}
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
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Start-Datum der Serie
                </label>
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
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Mitarbeiter auswählen
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
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
                              onSelect={() => setSelectedEmployee(emp.id)}
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
            {shift.status === "completed" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    Dieser Einsatz ist abgeschlossen. Das Löschen entfernt auch den zugehörigen
                    Zeiteintrag.
                  </span>
                </p>
              </div>
            )}
            {shift.is_recurring && !shift.is_detached_from_series ? (
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Wie möchten Sie löschen?</p>
                <div className="space-y-1.5">
                  {[
                    { mode: "single" as SeriesDeleteMode, label: "Nur diesen Termin", desc: `Löscht nur ${formattedDate}` },
                    { mode: "future" as SeriesDeleteMode, label: "Alle zukünftigen", desc: "Abgeschlossene bleiben erhalten" },
                    { mode: "all" as SeriesDeleteMode, label: "Gesamte Serie", desc: "ALLE Termine werden gelöscht" },
                  ].map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setDeleteMode(opt.mode)}
                      className={cn(
                        "w-full p-2 rounded text-left text-sm",
                        deleteMode === opt.mode
                          ? "bg-destructive/10 border border-destructive"
                          : "hover:bg-muted/50 border border-transparent"
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
    </>
  );
}

export type { ShiftActionsProps, ActionType, SeriesDeleteMode, SeriesEditMode, ShiftStatus };
