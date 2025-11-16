"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Briefcase } from "lucide-react";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { PaginationControls } from "@/components/pagination-controls";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

interface DisplayCustomerContact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  customer_name: string | null;
}

interface CustomerContactsTableViewProps {
  contacts: DisplayCustomerContact[];
  totalPages: number;
  currentPage: number;
  query: string;
  customerIdFilter: string;
  onActionSuccess?: () => void;
}

export function CustomerContactsTableView({
  contacts,
  totalPages,
  currentPage,
  query,
  customerIdFilter,
  onActionSuccess,
}: CustomerContactsTableViewProps) {

  if (contacts.length === 0 && !query && !customerIdFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Kundenkontakte vorhanden</p>
        <p className="text-sm">Fügen Sie einen neuen Kontakt hinzu, um Ihre Kundenbeziehungen zu verwalten.</p>
      </div>
    );
  }

  if (contacts.length === 0 && (query || customerIdFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Kundenkontakte gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Vorname</TableHead>
            <TableHead className="min-w-[150px]">Nachname</TableHead>
            <TableHead className="min-w-[120px]">Kunde</TableHead>
            <TableHead className="min-w-[150px]">E-Mail</TableHead>
            <TableHead className="min-w-[120px]">Telefon</TableHead>
            <TableHead className="min-w-[120px]">Rolle</TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium text-sm">{contact.first_name}</TableCell>
              <TableCell className="font-medium text-sm">{contact.last_name}</TableCell>
              <TableCell className="text-sm">{contact.customer_name || 'N/A'}</TableCell>
              <TableCell className="text-sm">{contact.email || 'N/A'}</TableCell>
              <TableCell className="text-sm">{contact.phone || 'N/A'}</TableCell>
              <TableCell className="text-sm">{contact.role || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <RecordDetailsDialog record={contact} title={`Details zu Kundenkontakt: ${contact.first_name} ${contact.last_name}`} />
                  <CustomerContactEditDialog contact={contact} onSuccess={onActionSuccess} />
                  <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={onActionSuccess} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}