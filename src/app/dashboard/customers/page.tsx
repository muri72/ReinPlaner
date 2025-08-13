import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomer } from "./actions";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { Mail, Phone, MapPin, Users, Handshake, PlusCircle } from "lucide-react"; // Neue Icons für Kundentyp
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge"; // Importiere Badge
import { Button } from "@/components/ui/button"; // Hinzugefügt
import { CustomerCreateDialog } from "@/components/customer-create-dialog"; // Import the new dialog
import { PaginationControls } from "@/components/pagination-controls"; // Importiere die neue Paginierungskomponente

export default async function CustomersPage({
  searchParams,
}: any) { // Typisierung auf 'any' geändert, um Next.js-Kompilierungsfehler zu umgehen
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9; // Standardmäßig 9 Kunden pro Seite

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let customersQuery = supabase
    .from('customers')
    .select('*', { count: 'exact' }) // count: 'exact' ist wichtig für die Paginierung
    .order('name', { ascending: true })
    .range(from, to); // Paginierung anwenden

  if (query) {
    customersQuery = customersQuery.or(
      `name.ilike.%${query}%,address.ilike.%${query}%,contact_email.ilike.%${query}%,contact_phone.ilike.%${query}%,customer_type.ilike.%${query}%`
    );
  }

  const { data: customers, error, count } = await customersQuery;

  if (error) {
    console.error("Fehler beim Laden der Kunden:", error);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Kunden.</div>;
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Kunden</h1>

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Kunden suchen..." />
        <CustomerCreateDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {customers.length === 0 && !query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
            <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
            <div className="mt-4">
              <CustomerCreateDialog />
            </div>
          </div>
        ) : customers.length === 0 && query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
            <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
          </div>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} className="shadow-neumorphic glassmorphism-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-semibold">{customer.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <CustomerEditDialog customer={customer} />
                  <DeleteCustomerButton customerId={customer.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  {customer.customer_type === 'partner' ? (
                    <Handshake className="mr-2 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Typ: <Badge variant="secondary">{customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}</Badge></span>
                </div>
                {customer.address && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{customer.address}</span>
                  </div>
                )}
                {customer.contact_email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{customer.contact_email}</span>
                  </div>
                )}
                {customer.contact_phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{customer.contact_phone}</span>
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