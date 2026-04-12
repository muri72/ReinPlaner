"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeEntryFormValues } from "@/lib/utils/form-utils";

interface TimeEntryBasicSectionProps {
  form: ReturnType<typeof useForm<TimeEntryFormValues>>;
  employees: any[];
  customers: any[];
  loadingDropdowns: boolean;
  filteredObjects: any[];
  filteredOrders: any[];
  isAdmin: boolean;
}

export function TimeEntryBasicSection({
  form,
  employees,
  customers,
  loadingDropdowns,
  filteredObjects,
  filteredOrders,
  isAdmin
}: TimeEntryBasicSectionProps) {
  return (
    <>
      {/* Employee Selection - only visible for admins */}
      {isAdmin && (
        <div>
          <Label htmlFor="employeeId">Mitarbeiter</Label>
          <Controller
            name="employeeId"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value || null)}
                value={field.value ?? ""}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Customer Selection */}
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Controller
          name="customerId"
          control={form.control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value || null)}
              value={field.value ?? ""}
              disabled={loadingDropdowns}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((cust) => (
                  <SelectItem key={cust.id} value={cust.id}>
                    {cust.company_name || cust.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Object Selection */}
      <div>
        <Label htmlFor="objectId">Objekt</Label>
        <Controller
          name="objectId"
          control={form.control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value || null)}
              value={field.value ?? ""}
              disabled={loadingDropdowns || !filteredObjects.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Objekt auswählen" />
              </SelectTrigger>
              <SelectContent>
                {filteredObjects.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Order Selection */}
      <div>
        <Label htmlFor="orderId">Auftrag</Label>
        <Controller
          name="orderId"
          control={form.control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value || null)}
              value={field.value ?? ""}
              disabled={loadingDropdowns || !filteredOrders.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auftrag auswählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.title || order.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          placeholder="Optionale Notizen..."
          {...form.register("notes")}
        />
      </div>
    </>
  );
}