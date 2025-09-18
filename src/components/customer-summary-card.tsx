"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Users, Handshake } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  customer_type: string;
}

interface CustomerSummaryCardProps {
  customer: Customer;
}

export function CustomerSummaryCard({ customer }: CustomerSummaryCardProps) {
  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Kundenübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center">
          {customer.customer_type === 'partner' ? (
            <Handshake className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <Users className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium mr-2">Typ:</span>
          <Badge variant="secondary">{customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}</Badge>
        </div>
        {customer.contact_email && (
          <div className="flex items-center">
            <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <a href={`mailto:${customer.contact_email}`} className="text-primary hover:underline">{customer.contact_email}</a>
          </div>
        )}
        {customer.contact_phone && (
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <a href={`tel:${customer.contact_phone}`} className="text-primary hover:underline">{customer.contact_phone}</a>
          </div>
        )}
        {customer.address && (
          <div className="flex items-start">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
            <span>{customer.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}