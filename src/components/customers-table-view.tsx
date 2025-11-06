"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Users, Handshake, FileText, Eye } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
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

interface CustomersTableViewProps {
  customers: DisplayCustomer[];
  totalPages: number;
  currentPage: number;
  query: string;
  customerTypeFilter: string;
  onActionSuccess: () => void;
}

export function CustomersTableView({
  customers,
  totalPages,
  currentPage,
  query,
  customerTypeFilter,
  onActionSuccess,
}: CustomersTableViewProps) {

  if (customers.length === 0 && !query && !customerTypeFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
        <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
      </div>
    );
  }

  if (customers.length === 0 && (query || customerTypeFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Name</TableHead>
            <TableHead className="min-w-[100px]">Typ</TableHead>
            <TableHead className="min-w-[200px]">Adresse</TableHead>
            <TableHead className="min-w-[150px]">E-Mail</TableHead>
            <TableHead className="min-w-[120px]">Telefon</TableHead>
            <TableHead className="min-w-[200px]">Vertragsdaten</TableHead> {/* New column */}
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium text-sm">{customer.name}</TableCell>
              <TableCell className="text-sm">
                <Badge variant="secondary">
                  {customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{customer.address || 'N/A'}</TableCell>
              <TableCell className="text-sm">{customer.contact_email || 'N/A'}</TableCell>
              <TableCell className="text-sm">{customer.contact_phone || 'N/A'}</TableCell>
              <TableCell className="text-sm truncate max-w-xs">{customer.contractual_services || 'N/A'}</TableCell> {/* New cell */}
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/customers/${customer.id}`} title="Details anzeigen">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}