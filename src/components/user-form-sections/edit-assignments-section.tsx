"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Employee, Customer, CustomerContact } from "@/hooks/use-user-form-data";

interface EditAssignmentsSectionProps {
  form: any;
  employees: Employee[];
  customers: Customer[];
  customerContactsForUserAssignment: CustomerContact[];
  loadingDropdowns: boolean;
  selectedEmployeeId?: string | null;
  selectedCustomerId?: string | null;
  selectedCustomerContactId?: string | null;
  initialData: any;
  onEmployeeChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
}

export function EditAssignmentsSection({
  form,
  employees,
  customers,
  customerContactsForUserAssignment,
  loadingDropdowns,
  selectedEmployeeId,
  selectedCustomerId,
  selectedCustomerContactId,
  initialData,
  onEmployeeChange,
  onCustomerChange,
  onCustomerContactChange,
}: EditAssignmentsSectionProps) {
  const hasEmployeeAssignment = !!(initialData?.employee || selectedEmployeeId) && !selectedCustomerContactId;
  const hasContactAssignment = !!selectedCustomerContactId && !selectedEmployeeId;
  const hasNoAssignment = !selectedEmployeeId && !selectedCustomerContactId;

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-md font-semibold mb-2">Profil-Zuweisungen bearbeiten:</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Sie können die Zuweisung zu einem Mitarbeiter oder Kundenkontakt ändern oder aufheben.
      </p>

      {/* Current Employee Assignment */}
      {hasEmployeeAssignment ? (
        <div className="p-4 border rounded-lg bg-muted/20 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">Aktuell zugewiesen an Mitarbeiter:</p>
              <p className="text-sm text-muted-foreground">
                {initialData?.employee
                  ? `${initialData.employee.first_name} ${initialData.employee.last_name}`
                  : employees.find(emp => emp.id === selectedEmployeeId)?.first_name + ' ' + employees.find(emp => emp.id === selectedEmployeeId)?.last_name
                }
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue("employeeId", null)}
            >
              Zuweisung aufheben
            </Button>
          </div>
        </div>
      ) : null}

      {/* Current Customer Contact Assignment */}
      {hasContactAssignment ? (
        <div className="p-4 border rounded-lg bg-muted/20 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">Aktuell zugewiesen an Kundenkontakt:</p>
              <p className="text-sm text-muted-foreground">
                {initialData?.customerContact
                  ? `${initialData.customerContact.first_name} ${initialData.customerContact.last_name}`
                  : customerContactsForUserAssignment.find(contact => contact.id === selectedCustomerContactId)?.first_name + ' ' + customerContactsForUserAssignment.find(contact => contact.id === selectedCustomerContactId)?.last_name
                }
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.setValue("customerContactId", null);
                form.setValue("customerId", null);
              }}
            >
              Zuweisung aufheben
            </Button>
          </div>
        </div>
      ) : null}

      {/* No Assignment */}
      {hasNoAssignment ? (
        <div className="p-4 border rounded-lg bg-muted/20 mb-4">
          <p className="text-sm text-muted-foreground">Dieser Benutzer ist aktuell keinem Mitarbeiter oder Kundenkontakt zugewiesen.</p>
        </div>
      ) : null}

      {/* Change Assignment Section */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="employeeId">Mitarbeiter zuweisen (optional)</Label>
          <Select
            onValueChange={onEmployeeChange}
            value={selectedEmployeeId || "unassigned"}
            disabled={loadingDropdowns}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mitarbeiter auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen (System-User)</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : ''} {emp.user_id && emp.user_id !== initialData?.id ? '⚠️ (Bereits zugewiesen - wird entkoppelt)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="customerId">Kunde für Kundenkontakt (optional)</Label>
          <Select
            onValueChange={onCustomerChange}
            value={selectedCustomerId || "unassigned"}
            disabled={loadingDropdowns || !!selectedEmployeeId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kunde auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Kunde ausgewählt</SelectItem>
              {customers.map(cust => (
                <SelectItem key={cust.id} value={cust.id}>
                  {cust.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="customerContactId">Kundenkontakt zuweisen (optional)</Label>
          <Select
            onValueChange={onCustomerContactChange}
            value={selectedCustomerContactId || "unassigned"}
            disabled={loadingDropdowns || !!selectedEmployeeId || !selectedCustomerId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kundenkontakt auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
              {customerContactsForUserAssignment.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
