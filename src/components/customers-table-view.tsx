"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";

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
  const isMobile = useIsMobile();

  if (customers.length === 0 && !query && !customerTypeFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
        <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
      </div>
    );
  }

  if (customers.length === 0 && (query || customerTypeFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {customers.map((customer) => (
          <Card key={customer.id} className="p-4">
            <CardContent className="p-0 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{customer.name}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" asChild className="flex-shrink-0 ml-2">
                  <Link href={`/dashboard/customers/${customer.id}`} title="Details anzeigen">
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {customer.address && (
                  <div className="col-span-2">
                    <span className="font-medium text-foreground">Adresse: </span>
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                {customer.contact_email && (
                  <div className="col-span-2">
                    <span className="font-medium text-foreground">E-Mail: </span>
                    <span className="truncate">{customer.contact_email}</span>
                  </div>
                )}
                {customer.contact_phone && (
                  <div className="col-span-2">
                    <span className="font-medium text-foreground">Tel: </span>
                    <span>{customer.contact_phone}</span>
                  </div>
                )}
                {customer.contractual_services && (
                  <div className="col-span-2">
                    <span className="font-medium text-foreground">Vertrag: </span>
                    <span className="truncate">{customer.contractual_services}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Name</TableHead>
            <TableHead className="min-w-[100px]">Typ</TableHead>
            <TableHead className="min-w-[200px]">Adresse</TableHead>
            <TableHead className="min-w-[150px]">E-Mail</TableHead>
            <TableHead className="min-w-[120px]">Telefon</TableHead>
            <TableHead className="min-w-[200px]">Vertragsdaten</TableHead>
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
              <TableCell className="text-sm truncate max-w-xs">{customer.contractual_services || 'N/A'}</TableCell>
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