"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Users, Handshake } from "lucide-react";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { CustomerCreateDialog } from "@/components/customer-create-dialog";

interface DisplayCustomer {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  customer_type: string;
}

interface CustomersGridViewProps {
  customers: DisplayCustomer[];
  query: string;
  customerTypeFilter: string;
  onActionSuccess: () => void;
}

export function CustomersGridView({ customers, query, customerTypeFilter, onActionSuccess }: CustomersGridViewProps) {
  if (customers.length === 0 && !query && !customerTypeFilter) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
        <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
        <div className="mt-4">
          <CustomerCreateDialog onCustomerCreated={onActionSuccess} />
        </div>
      </div>
    );
  }

  if (customers.length === 0 && (query || customerTypeFilter)) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {customers.map((customer) => (
        <Card key={customer.id} className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base md:text-lg font-semibold">{customer.name}</CardTitle>
            <div className="flex items-center space-x-2">
              <RecordDetailsDialog record={customer} title={`Details zu Kunde: ${customer.name}`} />
              <CustomerEditDialog customer={customer} onSuccess={onActionSuccess} />
              <DeleteCustomerButton customerId={customer.id} onDeleteSuccess={onActionSuccess} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              {customer.customer_type === 'partner' ? (
                <Handshake className="mr-2 h-4 w-4 flex-shrink-0" />
              ) : (
                <Users className="mr-2 h-4 w-4 flex-shrink-0" />
              )}
              <span>Typ: <Badge variant="secondary">{customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}</Badge></span>
            </div>
            {customer.address && (
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.contact_email && (
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{customer.contact_email}</span>
              </div>
            )}
            {customer.contact_phone && (
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{customer.contact_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}