"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { CustomerCreateDialog } from "@/components/customer-create-dialog";
import Link from "next/link";

interface DisplayCustomer {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  customer_type: string;
  contractual_services: string | null; // New field
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
        <Link key={customer.id} href={`/dashboard/customers/${customer.id}`} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out">
          <Card className="shadow-neumorphic glassmorphism-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base md:text-lg font-semibold line-clamp-2">{customer.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Typ:</span> {customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}
              </p>
              {customer.address && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Adresse:</span> {customer.address}
                </p>
              )}
              {customer.contact_email && (
                <p className="text-sm text-muted-foreground truncate">
                  <span className="font-medium">E-Mail:</span> {customer.contact_email}
                </p>
              )}
              {customer.contact_phone && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Telefon:</span> {customer.contact_phone}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}