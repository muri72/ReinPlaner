"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Users, Handshake, ArrowUp, ArrowDown } from "lucide-react";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

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

interface CustomersTableViewProps {
  customers: DisplayCustomer[];
  totalPages: number;
  currentPage: number;
  query: string;
  customerTypeFilter: string;
  sortColumn: string;
  sortDirection: string;
}

export function CustomersTableView({
  customers,
  totalPages,
  currentPage,
  query,
  customerTypeFilter,
  sortColumn,
  sortDirection,
}: CustomersTableViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, router, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

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
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('name')} className="px-0 hover:bg-transparent">
                Name {renderSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('customer_type')} className="px-0 hover:bg-transparent">
                Typ {renderSortIcon('customer_type')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button variant="ghost" onClick={() => handleSort('address')} className="px-0 hover:bg-transparent">
                Adresse {renderSortIcon('address')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('contact_email')} className="px-0 hover:bg-transparent">
                E-Mail {renderSortIcon('contact_email')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('contact_phone')} className="px-0 hover:bg-transparent">
                Telefon {renderSortIcon('contact_phone')}
              </Button>
            </TableHead>
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
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <RecordDetailsDialog record={customer} title={`Details zu Kunde: ${customer.name}`} />
                  <CustomerEditDialog customer={customer} />
                  <DeleteCustomerButton customerId={customer.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}