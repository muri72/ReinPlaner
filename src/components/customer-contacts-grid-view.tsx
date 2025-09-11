"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Briefcase, ContactRound } from "lucide-react";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";

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

interface CustomerContactsGridViewProps {
  contacts: DisplayCustomerContact[];
  query: string;
  customerIdFilter: string;
  onActionSuccess: () => void;
}

export function CustomerContactsGridView({
  contacts,
  query,
  customerIdFilter,
  onActionSuccess,
}: CustomerContactsGridViewProps) {

  if (contacts.length === 0 && !query && !customerIdFilter) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Kundenkontakte vorhanden</p>
        <p className="text-sm">Fügen Sie einen neuen Kontakt hinzu, um Ihre Kundenbeziehungen zu verwalten.</p>
        <div className="mt-4">
          <CustomerContactCreateGeneralDialog onContactCreated={onActionSuccess} />
        </div>
      </div>
    );
  }

  if (contacts.length === 0 && (query || customerIdFilter)) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Kundenkontakte gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {contacts.map((contact) => (
        <Card key={contact.id} className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base md:text-lg font-semibold">{contact.first_name} {contact.last_name}</CardTitle>
            <div className="flex items-center space-x-2">
              <RecordDetailsDialog record={contact} title={`Details zu Kundenkontakt: ${contact.first_name} ${contact.last_name}`} />
              <CustomerContactEditDialog contact={contact} />
              <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={onActionSuccess} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {contact.customer_name && (
              <p className="text-sm text-muted-foreground">
                Kunde: {contact.customer_name}
              </p>
            )}
            {contact.email && (
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.role && (
              <div className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Rolle: {contact.role}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}