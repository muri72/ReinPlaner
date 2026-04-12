"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Customer {
  id: string;
  name: string;
}

interface ManagerSectionProps {
  form: any;
  allCustomersForManager: Customer[];
  selectedRole?: string;
}

export function ManagerSection({ form, allCustomersForManager, selectedRole }: ManagerSectionProps) {
  if (selectedRole !== "manager") return null;

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-md font-semibold mb-2">Kunden-Zuordnungen (Manager):</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Wählen Sie die Kunden, für die dieser Manager verantwortlich sein soll.
      </p>

      <div>
        <Label htmlFor="managerCustomerIds">Kunden auswählen</Label>
        <Select
          onValueChange={(value) => {
            // For now, single-select - can be extended to multi-select
            form.setValue("managerCustomerIds", [value]);
          }}
          value={form.watch("managerCustomerIds")?.[0] || "unassigned"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunden auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kunde ausgewählt</SelectItem>
            {allCustomersForManager.map(cust => (
              <SelectItem key={cust.id} value={cust.id}>
                {cust.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.managerCustomerIds && (
          <p className="text-red-500 text-sm mt-1">
            {typeof form.formState.errors.managerCustomerIds.message === 'string' 
              ? form.formState.errors.managerCustomerIds.message 
              : 'Bitte wählen Sie mindestens einen Kunden aus.'}
          </p>
        )}
      </div>
    </div>
  );
}
