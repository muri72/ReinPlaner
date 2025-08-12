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

export default async function CustomersPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let customersQuery = supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  // Die explizite user_id-Filterung wird entfernt, da RLS dies übernimmt.
  // if (!isAdmin) {
  //   customersQuery = customersQuery.eq('user_id', currentUser.id);
  // }

  if (query) {
    customersQuery = customersQuery.or(
      `name.ilike.%${query}%,address.ilike.%${query}%,contact_email.ilike.%${query}%,contact_phone.ilike.%${query}%,customer_type.ilike.%${query}%` // Suche auch nach Kundentyp
    );
  }

  const { data: customers, error } = await customersQuery;

  if (error) {
    console.error("Fehler beim Laden der Kunden:", error);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Kunden.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Kunden</h1>

      <div className="mb-4 flex justify-between items-center">
        <SearchInput placeholder="Kunden suchen..." />
        <CustomerCreateDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {customers.length === 0 && !query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-elevation-2">
            <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
            <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um Ihre Geschäftsbeziehungen zu verwalten.</p>
            <div className="mt-4">
              {/* The button to open the dialog is now part of CustomerCreateDialog */}
            </div>
          </div>
        ) : customers.length === 0 && query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-elevation-2">
            <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
            <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer. Versuchen Sie eine andere Suchanfrage.</p>
          </div>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} className="shadow-elevation-1">
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
    </div>
  );
}