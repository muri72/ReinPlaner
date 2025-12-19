"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, PlusCircle, ArrowUpDown, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface FilterOption {
  value: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface SortOption {
  value: string;
  label: string;
}

interface DataTableToolbarProps {
  searchPlaceholder: string;
  filterOptions: FilterOption[];
  sortOptions: SortOption[];
}

export function DataTableToolbar({
  searchPlaceholder,
  filterOptions,
  sortOptions,
}: DataTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = React.useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = React.useState<FilterOption | null>(null);

  const activeFilters = React.useMemo(() => {
    const filters: { key: string; value: string }[] = [];
    filterOptions.forEach(option => {
      if (searchParams.has(option.value)) {
        filters.push({ key: option.value, value: searchParams.get(option.value)! });
      }
    });
    return filters;
  }, [searchParams, filterOptions]);

  const currentSortColumn = searchParams.get("sortColumn") || sortOptions[0]?.value || "";
  const currentSortDirection = searchParams.get("sortDirection") || "desc";

  const createQueryString = React.useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      }
      return newSearchParams.toString();
    },
    [searchParams]
  );

  const handleSetFilter = (key: string, value: string) => {
    router.push(`${pathname}?${createQueryString({ [key]: value, page: '1' })}`);
    setIsFilterPopoverOpen(false);
  };

  const handleRemoveFilter = (key: string) => {
    router.push(`${pathname}?${createQueryString({ [key]: null, page: '1' })}`);
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    activeFilters.forEach(filter => newParams.delete(filter.key));
    newParams.delete("query");
    newParams.set('page', '1');
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleSetSort = (key: string, value: string) => {
    router.push(`${pathname}?${createQueryString({ [key]: value, page: '1' })}`);
  };

  const getFilterLabel = (key: string, value: string): string => {
    const option = filterOptions.find(o => o.value === key);
    if (!option) return `${key}: ${value}`;
    const valueOption = option.options.find(o => o.value === value);
    return `${option.label}: ${valueOption?.label || value}`;
  };

  // Reset active filter category when main popover closes
  React.useEffect(() => {
    if (!isFilterPopoverOpen) {
      setActiveFilterCategory(null);
    }
  }, [isFilterPopoverOpen]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <Input placeholder={searchPlaceholder} className="w-full sm:max-w-xs" />
        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 border-dashed w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Filter hinzufügen
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder={activeFilterCategory ? "Wert auswählen..." : "Filter nach..."} />
              <CommandList>
                <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
                {activeFilterCategory ? (
                  <>
                    <CommandGroup>
                      <CommandItem onSelect={() => setActiveFilterCategory(null)} className="cursor-pointer">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Zurück
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading={activeFilterCategory.label}>
                      {activeFilterCategory.options.map((valueOption) => (
                        <CommandItem
                          key={valueOption.value}
                          onSelect={() => handleSetFilter(activeFilterCategory.value, valueOption.value)}
                        >
                          <span>{valueOption.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                ) : (
                  <CommandGroup>
                    {filterOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => setActiveFilterCategory(option)}
                      >
                        <span>{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sortieren
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={currentSortColumn}
              onValueChange={(value) => handleSetSort("sortColumn", value)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Richtung</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={currentSortDirection}
              onValueChange={(value) => handleSetSort("sortDirection", value)}
            >
              <DropdownMenuRadioItem value="asc">Aufsteigend</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Absteigend</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Aktive Filter:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="px-2 py-1 rounded-sm"
            >
              {getFilterLabel(filter.key, filter.value)}
              <button
                onClick={() => handleRemoveFilter(filter.key)}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="h-8 px-2 lg:px-3 text-destructive hover:text-destructive"
          >
            Alle zurücksetzen
          </Button>
        </div>
      )}
    </div>
  );
}