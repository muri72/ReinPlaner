"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MultiSelect } from "@/components/ui/multi-select";
import { Filter, X, Building2, Briefcase, Calendar, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  objects: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  shiftStatus: z.string().optional(),
  showAvailableOnly: z.boolean().optional(),
});

type FilterValues = z.infer<typeof formSchema>;

interface PlanningFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  objects: { id: string; name: string }[];
  services: { id: string; title: string; color?: string }[];
  onClearAll: () => void;
}

export function PlanningFilterDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  objects,
  services,
  onClearAll,
}: PlanningFilterDialogProps) {
  const [isOpen, setIsOpen] = React.useState(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const form = useForm<FilterValues>({
    resolver: zodResolver(formSchema),
    defaultValues: filters,
    mode: "all", // Validate on submit, not on every change
  });

  // Local state for temporary filter values (updated by badges, form changes)
  const [localFilters, setLocalFilters] = React.useState<FilterValues>(filters);

  // Sync local filters when filters prop changes (dialog opens, etc.)
  React.useEffect(() => {
    setLocalFilters(filters);
    form.reset(filters);
  }, [filters, form]);

  // IMPORTANT: Watch form changes and update localFilters
  // Use deep comparison to avoid infinite loops
  const formValues = form.watch();
  const prevValuesRef = React.useRef<FilterValues>(formValues);

  React.useEffect(() => {
    // Only update if values actually changed (deep comparison)
    const hasChanged = JSON.stringify(formValues) !== JSON.stringify(prevValuesRef.current);
    if (hasChanged) {
      setLocalFilters(formValues);
      prevValuesRef.current = formValues;
    }
  }, [formValues]);

  const onSubmit = (values: FilterValues) => {
    // Use current form values which include all MultiSelect changes
    onFiltersChange(values);
    setIsOpen(false);
    onOpenChange(false);
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (localFilters.objects?.length) count++;
    if (localFilters.services?.length) count++;
    if (localFilters.shiftStatus && localFilters.shiftStatus !== "all") count++;
    if (localFilters.showAvailableOnly) count++;
    return count;
  }, [localFilters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filteroptionen
          </DialogTitle>
          <DialogDescription>
            Filtern Sie die Planungsansicht nach verschiedenen Kriterien.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Objects */}
            <FormField
              name="objects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Objekte
                  </FormLabel>
                  <MultiSelect
                    items={objects.map(o => ({ id: o.id, name: o.name }))}
                    selectedIds={field.value || []}
                    onSelectionChange={(ids) => field.onChange(ids.length > 0 ? ids : undefined)}
                    placeholder="Objekte auswählen..."
                    searchPlaceholder="Objekt suchen..."
                    emptyMessage="Keine Objekte gefunden."
                  />
                </FormItem>
              )}
            />

            <Separator />

            {/* Services */}
            <FormField
              name="services"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Service-Typen
                  </FormLabel>
                  <MultiSelect
                    items={services.map(s => ({ id: s.id, name: s.title, color: s.color }))}
                    selectedIds={field.value || []}
                    onSelectionChange={(ids) => field.onChange(ids.length > 0 ? ids : undefined)}
                    placeholder="Services auswählen..."
                    searchPlaceholder="Service suchen..."
                    emptyMessage="Keine Services gefunden."
                  />
                </FormItem>
              )}
            />

            <Separator />

            {/* Shift Status */}
            <FormField
              name="shiftStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schicht-Status
                  </FormLabel>
                  <Select
                    value={field.value || "all"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle Stati" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Alle Stati</SelectItem>
                      <SelectItem value="scheduled">Geplant</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Separator />

            {/* Available Only Toggle */}
            <FormField
              name="showAvailableOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2 cursor-pointer">
                      <Clock className="h-4 w-4" />
                      Nur verfügbare Mitarbeiter anzeigen
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Zeigt nur Mitarbeiter mit offenen Stunden in der Woche
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Aktiv:</span>
                {localFilters.objects?.map((id) => {
                  const obj = objects.find((o) => o.id === id);
                  return obj ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {obj.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          // Update local state and form synchronously
                          const newObjects = localFilters.objects?.filter((o) => o !== id) || [];
                          const updatedFilters = { ...localFilters, objects: newObjects.length > 0 ? newObjects : undefined };
                          setLocalFilters(updatedFilters);
                          form.setValue('objects', newObjects.length > 0 ? newObjects : undefined);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
                {localFilters.services?.map((id) => {
                  const service = services.find((s) => s.id === id);
                  return service ? (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1"
                      style={{
                        backgroundColor: service.color || undefined,
                        color: service.color ? "white" : undefined,
                      }}
                    >
                      {service.title}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          // Update local state and form synchronously
                          const newServices = localFilters.services?.filter((s) => s !== id) || [];
                          const updatedFilters = { ...localFilters, services: newServices.length > 0 ? newServices : undefined };
                          setLocalFilters(updatedFilters);
                          form.setValue('services', newServices.length > 0 ? newServices : undefined);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
                {localFilters.shiftStatus && localFilters.shiftStatus !== 'all' && (
                  <Badge variant="outline" className="gap-1">
                    {localFilters.shiftStatus === 'scheduled' && 'Geplant'}
                    {localFilters.shiftStatus === 'in_progress' && 'In Bearbeitung'}
                    {localFilters.shiftStatus === 'completed' && 'Abgeschlossen'}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        const updatedFilters = { ...localFilters, shiftStatus: undefined };
                        setLocalFilters(updatedFilters);
                        form.setValue('shiftStatus', undefined);
                      }}
                    />
                  </Badge>
                )}
                {localFilters.showAvailableOnly && (
                  <Badge variant="outline" className="gap-1">
                    Nur verfügbar
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        const updatedFilters = { ...localFilters, showAvailableOnly: false };
                        setLocalFilters(updatedFilters);
                        form.setValue('showAvailableOnly', false);
                      }}
                    />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground"
                  onClick={() => {
                    onClearAll();
                    const emptyFilters: FilterValues = {};
                    setLocalFilters(emptyFilters);
                    form.reset(emptyFilters);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Alle löschen
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                onClearAll();
                const emptyFilters: FilterValues = {};
                setLocalFilters(emptyFilters);
                form.reset(emptyFilters);
              }}>
                Zurücksetzen
              </Button>
              <Button type="submit">Anwenden</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
