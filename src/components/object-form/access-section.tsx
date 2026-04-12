"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ObjectAccessSectionProps {
  form: any;
}

export function ObjectAccessSection({ form }: ObjectAccessSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priorität</Label>
          <Controller
            name="priority"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="timeOfDay">Tageszeit</Label>
          <Controller
            name="timeOfDay"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Beliebig</SelectItem>
                  <SelectItem value="morning">Morgens</SelectItem>
                  <SelectItem value="noon">Mittags</SelectItem>
                  <SelectItem value="afternoon">Nachmittags</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="accessMethod">Zugangsart</Label>
          <Controller
            name="accessMethod"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="key">Schlüssel</SelectItem>
                  <SelectItem value="card">Karte</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="pin">PIN / Code</Label>
          <Input id="pin" type="password" {...form.register("pin")} />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2">
          <Controller
            name="isAlarmSecured"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                id="isAlarmSecured"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isAlarmSecured" className="text-sm font-medium">
            Alarmanlage gesichert
          </Label>
        </div>

        {form.watch("isAlarmSecured") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div>
              <Label htmlFor="alarmPassword">Alarmkennwort</Label>
              <Input id="alarmPassword" type="password" {...form.register("alarmPassword")} />
            </div>
            <div>
              <Label htmlFor="securityCodeWord">Sicherheitscodewort</Label>
              <Input id="securityCodeWord" type="password" {...form.register("securityCodeWord")} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
