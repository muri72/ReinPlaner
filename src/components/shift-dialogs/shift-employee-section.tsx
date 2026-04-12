"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeOption {
  id: string;
  name: string;
}

interface ShiftEmployeeSectionProps {
  selectedEmployeeIds: string[];
  onEmployeeSelect: (employeeId: string) => void;
  availableEmployees: EmployeeOption[];
  employeeSelectOpen: boolean;
  setEmployeeSelectOpen: (open: boolean) => void;
  getEmployeeName: (id: string) => string;
  label?: string;
  mode?: "single" | "multi";
  placeholder?: string;
}

export function ShiftEmployeeSection({
  selectedEmployeeIds,
  onEmployeeSelect,
  availableEmployees,
  employeeSelectOpen,
  setEmployeeSelectOpen,
  getEmployeeName,
  label = "Mitarbeiter",
  mode = "multi",
  placeholder = "Mitarbeiter auswählen...",
}: ShiftEmployeeSectionProps) {
  const hasSelection = mode === "multi" ? selectedEmployeeIds.length > 0 : !!selectedEmployeeIds;

  return (
    <div>
      {label && (
        <p className="text-sm text-muted-foreground mb-1.5 block">
          {label}
          {mode === "multi" && selectedEmployeeIds.length > 0 && (
            <span className="ml-1">({selectedEmployeeIds.length} ausgewählt)</span>
          )}
        </p>
      )}
      <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={employeeSelectOpen}
            className={cn(
              "w-full justify-between",
              mode === "multi" ? "h-auto min-h-[36px] flex-wrap" : "",
              !hasSelection && "text-muted-foreground"
            )}
          >
            {hasSelection ? (
              mode === "multi" ? (
                <div className="flex flex-wrap gap-1">
                  {selectedEmployeeIds.map((id) => (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {getEmployeeName(id)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onEmployeeSelect(id);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              ) : (
                <span>{getEmployeeName(selectedEmployeeIds as string)}</span>
              )
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          style={{ maxHeight: mode === "multi" ? "300px" : undefined }}
          align="start"
        >
          <Command>
            <CommandInput placeholder="Mitarbeiter suchen..." />
            <CommandList className="max-h-[250px] overflow-y-auto">
              <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
              <CommandGroup heading="Mitarbeiter">
                {availableEmployees.map((emp) => {
                  const isSelected =
                    mode === "multi"
                      ? selectedEmployeeIds.includes(emp.id)
                      : selectedEmployeeIds === emp.id;

                  return (
                    <CommandItem
                      key={emp.id}
                      value={emp.name}
                      onSelect={() => onEmployeeSelect(emp.id)}
                    >
                      {mode === "multi" ? (
                        <div
                          className={cn(
                            "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          )}
                        >
                          {isSelected && <Plus className="h-3 w-3 text-primary-foreground mx-auto" />}
                        </div>
                      ) : (
                        <Check
                          className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                        />
                      )}
                      {emp.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
