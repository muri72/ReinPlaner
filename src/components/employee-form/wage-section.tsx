"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/date-picker";
import { getLohngruppenOptions, psaZuschlaege, zeitZuschlaege } from "@/lib/lohngruppen-config";

interface WageSurcharge {
  night_enabled: boolean;
  night_multiplier: number;
  weekend_enabled: boolean;
  weekend_multiplier: number;
  holiday_enabled: boolean;
  holiday_multiplier: number;
}

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

      {/* Zeit-Zuschläge Section */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-semibold mb-4">Zeit-Zuschläge (TV GD 2026)</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Aktivieren Sie die zutreffenden Zuschläge. Die Multiplikatoren basieren auf dem Tarifvertrag.
        </p>

        <div className="space-y-4">
          {/* Nachtzuschlag */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="wage_surcharge_night_enabled" className="text-sm font-medium">
                  Nachtzuschlag (22:00 - 06:00 Uhr)
                </Label>
                <Controller
                  name="wage_surcharge_night_enabled"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="wage_surcharge_night_enabled"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Multiplikator: {(zeitZuschlaege.find(z => z.id === 'nachtarbeit')?.multiplier ?? 1.25).toFixed(2)}x
              </p>
            </div>
          </div>

          {/* Wochenendzuschlag */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="wage_surcharge_weekend_enabled" className="text-sm font-medium">
                  Wochenendzuschlag (Sa/So)
                </Label>
                <Controller
                  name="wage_surcharge_weekend_enabled"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="wage_surcharge_weekend_enabled"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Multiplikator: {(zeitZuschlaege.find(z => z.id === 'sonntag')?.multiplier ?? 1.5).toFixed(2)}x
              </p>
            </div>
          </div>

          {/* Feiertagszuschlag */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="wage_surcharge_holiday_enabled" className="text-sm font-medium">
                  Feiertagszuschlag
                </Label>
                <Controller
                  name="wage_surcharge_holiday_enabled"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="wage_surcharge_holiday_enabled"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Multiplikator: {(zeitZuschlaege.find(z => z.id === 'feiertag')?.multiplier ?? 2.0).toFixed(2)}x
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
