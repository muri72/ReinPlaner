"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/date-picker";
import { getLohngruppenOptions, psaZuschlaege } from "@/lib/lohngruppen-config";

interface EmployeeWageSectionProps {
  form: any;
}

export function EmployeeWageSection({ form }: EmployeeWageSectionProps) {
  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Lohngruppe & Vergütung (TV GD 2026)</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tarifliche Eingruppierung gemäß Tarifvertrag für die Gebäudereinigung 2026
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="wage_group">Lohngruppe</Label>
          <Controller
            name="wage_group"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lohngruppe auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {getLohngruppenOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.wage_group && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.wage_group.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lohngruppen_eingruppung_datum">Datum der Eingruppierung</Label>
          <Controller
            name="lohngruppen_eingruppung_datum"
            control={form.control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="qualification">Qualifikationsnachweis</Label>
          <Input
            id="qualification"
            {...form.register("qualification")}
            placeholder="z.B. Desinfektor, Schädlingsbekämpfer"
          />
          <p className="text-xs text-muted-foreground mt-1">Besondere Qualifikationen dokumentieren</p>
        </div>

        <div>
          <Label htmlFor="psa_type">Persönliche Schutzausrüstung (PSA)</Label>
          <Controller
            name="psa_type"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value || undefined)}
                value={field.value !== null ? field.value : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="PSA-Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {psaZuschlaege.map((psa) => (
                    <SelectItem key={psa.id} value={psa.id}>
                      {psa.bezeichnung} {psa.zuschlagProzent > 0 ? `(+${psa.zuschlagProzent}%)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">Zutreffende PSA-Kategorie auswählen</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Controller
          name="has_professional_education"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="has_professional_education"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="has_professional_education" className="text-sm font-medium">
          3-jährige Berufsausbildung zum Gebäudereiniger absolviert
        </Label>
      </div>
    </div>
  );
}
