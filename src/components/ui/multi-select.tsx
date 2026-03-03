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
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectItem {
  id: string;
  name: string;
  color?: string;
}

interface MultiSelectProps {
  items: MultiSelectItem[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  items,
  selectedIds,
  onSelectionChange,
  placeholder = "Auswählen...",
  searchPlaceholder = "Suchen...",
  emptyMessage = "Keine Ergebnisse gefunden.",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (itemId: string) => {
    const isAlreadySelected = selectedIds.includes(itemId);
    let newSelection: string[];

    if (isAlreadySelected) {
      newSelection = selectedIds.filter((id) => id !== itemId);
    } else {
      newSelection = [...selectedIds, itemId];
    }
    onSelectionChange(newSelection);
  };

  const getItem = (id: string) => {
    return items.find((item) => item.id === id);
  };

  // Sort items alphabetically for the dropdown (with safety checks)
  const sortedItems = [...(items || [])]
    .filter((item) => item != null && item.name != null)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-[40px] flex-wrap", className)}
          disabled={disabled}
        >
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedIds.map((id) => {
                const item = getItem(id);
                if (!item) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{
                      backgroundColor: item.color || undefined,
                      color: item.color ? "white" : undefined,
                    }}
                  >
                    {item.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleSelect(id);
                      }}
                    />
                  </Badge>
                );
              })}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    handleSelect(item.id);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(item.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {item.color && (
                    <span
                      className="mr-2 h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
