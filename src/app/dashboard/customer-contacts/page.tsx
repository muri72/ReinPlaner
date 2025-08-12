import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerContactForm } from "@/components/customer-contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomerContact } from "./actions";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { Mail, Phone, Briefcase, UserRound, PlusCircle, ContactRound } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { PaginationControls } from "@/components/pagination-controls"; // Importiere die Paginierungskomponente

// Definieren Sie die Schnittstelle für die Kundenkontakt-Daten
interface DisplayCustomerContact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  customer_name: string | null; // Hinzugefügt für den Kundennamen
}

export default async function CustomerContactsPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9; // Standardmäßig 9 Kontakte pro Seite

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let customerContactsQuery = supabase
    .from('customer_contacts')
    .select(`
      *,
      customers ( name )
    `, { count: 'exact' }) // count: 'exact' ist wichtig für die Paginierung
    .order('last_name', { ascending: true })
    .range(from, to); // Paginierung anwenden

  if (query) {
    customerContactsQuery = customerContactsQuery.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,role.ilike.%${query}%,customers.name.ilike.%${query}%`
    );
  }

  const { data: contacts, error, count } = await customerContactsQuery;

  if (error) {
    console.error("Fehler beim Laden der Kundenkontakte:", error);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Kundenkontakte.</div>;
  }

  const displayContacts: DisplayCustomerContact[] = contacts?.map(contact => ({
    id: contact.id,
    customer_id: contact.customer_id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    created_at: contact.created_at,
    customer_name: contact.customers?.name || null,
  })) || [];

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Kundenkontakte</h1>

      <div className="mb-4 flex justify-between items-center">
        <SearchInput placeholder="Kundenkontakte suchen..." />
        <CustomerContactCreateGeneralDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {displayContacts.length === 0 && !query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
            <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Noch keine Kundenkontakte vorhanden</p>
            <p className="text-sm">Fügen Sie einen neuen Kontakt hinzu, um Ihre Kundenbeziehungen zu verwalten.</p>
            <div className="mt-4">
              <CustomerContactCreateGeneralDialog />
            </div>
          </div>
        ) : displayContacts.length === 0 && query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
            <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine Kundenkontakte gefunden</p>
            <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
          </div>
        ) : (
          displayContacts.map((contact) => (
            <Card key={contact.id} className="shadow-elevation-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-semibold">{contact.first_name} {contact.last_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <CustomerContactEditDialog contact={contact} />
                  <DeleteCustomerContactButton contactId={contact.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.customer_name && (
                  <p className="text-sm text-muted-foreground">
                    Kunde: {contact.customer_name}
                  </p>
                )}
                {contact.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.role && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Rolle: {contact.role}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}