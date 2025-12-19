"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem, // Added CommandItem import
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status?: string; // 'active' or 'inactive'
}

interface MultiSelectEmployeesProps {
  employees: Employee[];
  selectedEmployeeIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function MultiSelectEmployees({
  employees,
  selectedEmployeeIds,
  onSelectionChange,
  disabled,
  trigger,
}: MultiSelectEmployeesProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (employeeId: string) => {
    const isAlreadySelected = selectedEmployeeIds.includes(employeeId);
    let newSelection: string[];

    if (isAlreadySelected) {
      newSelection = selectedEmployeeIds.filter((id) => id !== employeeId);
    } else {
      newSelection = [...selectedEmployeeIds, employeeId];
    }
    onSelectionChange(newSelection);
  };

  const getEmployeeName = (id: string) => {
    const employee = employees.find((emp) => emp.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : "Unbekannt";
  };

  const getEmployeeStatus = (id: string) => {
    const employee = employees.find((emp) => emp.id === id);
    return employee?.status || 'active';
  };

  // Separate active employees (selectable) from already selected inactive employees (read-only)
  const selectableEmployees = employees.filter(emp => emp.status === 'active');
  const selectedInactiveEmployees = selectedEmployeeIds.filter(id => getEmployeeStatus(id) !== 'active');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] flex-wrap"
          disabled={disabled}
        >
          {selectedEmployeeIds.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedEmployeeIds.map((id) => {
                const isInactive = getEmployeeStatus(id) !== 'active';
                return (
                  <Badge
                    key={id}
                    variant={isInactive ? "destructive" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    {getEmployeeName(id)}
                    {isInactive && " (inaktiv)"}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation(); // Prevent popover from closing
                        handleSelect(id); // Allow removal of all employees (including inactive)
                      }}
                    />
                  </Badge>
                );
              })}
            </div>
          ) : (
            "Mitarbeiter auswählen..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Mitarbeiter suchen..." />
          <CommandList>
            <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
            <CommandGroup heading="Aktive Mitarbeiter">
              {selectableEmployees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.first_name} ${employee.last_name}`}
                  onSelect={() => {
                    handleSelect(employee.id);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEmployeeIds.includes(employee.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {employee.first_name} {employee.last_name}
                </CommandItem>
              ))}
            </CommandGroup>
            {selectedInactiveEmployees.length > 0 && (
              <CommandGroup heading="Bereits zugewiesene inaktive Mitarbeiter (entfernbar)">
                {selectedInactiveEmployees.map((id) => (
                  <CommandItem
                    key={id}
                    value={`${getEmployeeName(id)} (inaktiv)`}
                    onSelect={() => {
                      handleSelect(id);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedEmployeeIds.includes(id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {getEmployeeName(id)} (inaktiv)
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}