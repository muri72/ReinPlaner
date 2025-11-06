"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactRound, Mail, Phone, Briefcase } from "lucide-react";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import Link from "next/link";

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
        <Link key={contact.id} href={`/dashboard/customer-contacts/${contact.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">{contact.first_name} {contact.last_name}</CardTitle>
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
        </Link>
      ))}
    </div>
  );
}