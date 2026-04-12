"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmployeeFormValues } from "../employee-form";

interface EmployeeEmploymentSectionProps {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
}

export function EmployeeEmploymentSection({ form }: EmployeeEmploymentSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="on_leave">Beurlaubt</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="contract_type">Vertragsart</Label>
          <Controller
            name="contract_type"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(value || undefined);
                }}
                value={field.value ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vertragsart auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Vollzeit</SelectItem>
                  <SelectItem value="part_time">Teilzeit</SelectItem>
                  <SelectItem value="minijob">Minijob</SelectItem>
                  <SelectItem value="freelancer">Freiberufler</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="hourly_rate">Stundensatz (€)</Label>
        <Input id="hourly_rate" type="number" step="0.01" {...form.register("hourly_rate")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="social_security_number">Sozialversicherungsnummer</Label>
          <Input id="social_security_number" {...form.register("social_security_number")} />
        </div>
        <div>
          <Label htmlFor="tax_id_number">Steuer-ID</Label>
          <Input id="tax_id_number" {...form.register("tax_id_number")} />
        </div>
      </div>

      <div>
        <Label htmlFor="health_insurance_provider">Krankenkasse</Label>
        <Input id="health_insurance_provider" {...form.register("health_insurance_provider")} />
      </div>

      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="can_work_holidays" className="text-sm font-medium">
          Bereit für Feiertagsarbeit
        </Label>
        <Controller
          name="can_work_holidays"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="can_work_holidays"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
    </>
  );
}