"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Briefcase, ArrowUp, ArrowDown } from "lucide-react";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

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
  sortColumn: string;
  sortDirection: string;
}

export function CustomerContactsTableView({
  contacts,
  totalPages,
  currentPage,
  query,
  customerIdFilter,
  sortColumn,
  sortDirection,
}: CustomerContactsTableViewProps) {
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
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('first_name')} className="px-0 hover:bg-transparent">
                Vorname {renderSortIcon('first_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('last_name')} className="px-0 hover:bg-transparent">
                Nachname {renderSortIcon('last_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('customers.name')} className="px-0 hover:bg-transparent">
                Kunde {renderSortIcon('customers.name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('email')} className="px-0 hover:bg-transparent">
                E-Mail {renderSortIcon('email')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('phone')} className="px-0 hover:bg-transparent">
                Telefon {renderSortIcon('phone')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <Button variant="ghost" onClick={() => handleSort('role')} className="px-0 hover:bg-transparent">
                Rolle {renderSortIcon('role')}
              </Button>
            </TableHead>
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
                  <CustomerContactEditDialog contact={contact} />
                  <DeleteCustomerContactButton contactId={contact.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}