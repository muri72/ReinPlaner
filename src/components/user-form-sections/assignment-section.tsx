"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Employee, Customer, CustomerContact } from "@/hooks/use-user-form-data";

interface AssignmentSectionProps {
  employees: Employee[];
  customers: Customer[];
  customerContactsForUserAssignment: CustomerContact[];
  loadingDropdowns: boolean;
  selectedEmployeeId?: string | null;
  selectedCustomerId?: string | null;
  selectedCustomerContactId?: string | null;
  onEmployeeChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
  onReassignmentConfirm: (type: 'employee' | 'customerContact', id: string, name: string) => void;
  onUnassignConfirm: (type: 'employee' | 'customerContact' | 'customer', field: string, label: string) => void;
}

export function AssignmentSection({
  employees,
  customers,
  customerContactsForUserAssignment,
  loadingDropdowns,
  selectedEmployeeId,
  selectedCustomerId,
  selectedCustomerContactId,
  onEmployeeChange,
  onCustomerChange,
  onCustomerContactChange,
  onReassignmentConfirm,
  onUnassignConfirm,
}: AssignmentSectionProps) {
  const isDisabled = !!selectedCustomerId || !!selectedCustomerContactId;
  const isCustomerContactDisabled = !!selectedEmployeeId || !selectedCustomerId || customerContactsForUserAssignment.length === 0;

  return (
    <div className="border-b pb-4 mb-4">
      <h3 className="text-md font-semibold mb-2">Bestehendem Profil zuweisen:</h3>
      <p className="text-sm text-muted-foreground mb-3">
        💡 <strong>Tipp:</strong> Sie können jetzt auch <strong>System-User</strong> ohne Mitarbeiter-Zuweisung erstellen (z.B. für Admins).
        Bereits zugewiesene Mitarbeiter können neu zugewiesen werden - der alte Benutzer wird automatisch entkoppelt.
      </p>

      {/* Employee Assignment */}
      <div>
        <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
        <Select
          onValueChange={onEmployeeChange}
          value={selectedEmployeeId || "unassigned"}
          disabled={loadingDropdowns || isDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen (System-User)</SelectItem>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Filter */}
      <div className="mt-4">
        <Label htmlFor="customerId">Kunden filtern (optional)</Label>
        <Select
          onValueChange={onCustomerChange}
          value={selectedCustomerId || "unassigned"}
          disabled={loadingDropdowns || !!selectedEmployeeId || !!selectedCustomerContactId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunden auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kunde ausgewählt</SelectItem>
            {customers.map(cust => (
              <SelectItem key={cust.id} value={cust.id}>
                {cust.name} {cust.contact_email ? `(${cust.contact_email})` : ''} {cust.user_id ? '(Bereits zugewiesen)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Contact Assignment */}
      <div className="mt-4">
        <Label htmlFor="customerContactId">Kundenkontakt zuweisen (optional)</Label>
        <Select
          onValueChange={onCustomerContactChange}
          value={selectedCustomerContactId || "unassigned"}
          disabled={loadingDropdowns || isCustomerContactDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kundenkontakt auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
            {customerContactsForUserAssignment.map(contact => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''} {contact.user_id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCustomerId && customerContactsForUserAssignment.length === 0 && (
          <p className="text-muted-foreground text-sm mt-1">Keine Kontakte für diesen Kunden gefunden.</p>
        )}
      </div>
    </div>
  );
}
