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
  });

  React.useEffect(() => {
    form.reset(filters);
  }, [filters, form]);

  const onSubmit = (values: FilterValues) => {
    onFiltersChange(values);
    setIsOpen(false);
    onOpenChange(false);
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.objects?.length) count++;
    if (filters.services?.length) count++;
    if (filters.shiftStatus && filters.shiftStatus !== "all") count++;
    if (filters.showAvailableOnly) count++;
    return count;
  }, [filters]);

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
                  <Select
                    value={field.value?.[0] || ""}
                    onValueChange={(value) => {
                      if (value === "all" || !value) {
                        field.onChange(undefined);
                      } else {
                        field.onChange([value]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle Objekte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Alle Objekte</SelectItem>
                      {objects.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className={cn(
                          "cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors",
                          field.value?.includes(service.id)
                            ? "text-white"
                            : "bg-background hover:bg-muted"
                        )}
                        style={{
                          backgroundColor: field.value?.includes(service.id)
                            ? service.color || "var(--primary)"
                            : undefined,
                          borderColor: service.color || "var(--border)",
                        }}
                      >
                        <Checkbox
                          checked={field.value?.includes(service.id) || false}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, service.id]);
                            } else {
                              field.onChange(current.filter((id: string) => id !== service.id));
                            }
                          }}
                          className="sr-only"
                        />
                        {service.title}
                      </label>
                    ))}
                  </div>
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
                {filters.objects?.map((id) => {
                  const obj = objects.find((o) => o.id === id);
                  return obj ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {obj.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          onFiltersChange({ ...filters, objects: undefined });
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
                {filters.services?.map((id) => {
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
                          const newServices = filters.services?.filter((s) => s !== id);
                          onFiltersChange({ ...filters, services: newServices });
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground"
                  onClick={onClearAll}
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
              <Button type="button" variant="outline" onClick={onClearAll}>
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
