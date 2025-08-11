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
    return <div className="p-8 text-sm">Fehler beim Laden der Kunden.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Kunden</h1>

      <div className="mb-4">
        <SearchInput placeholder="Kunden suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.length === 0 && !query ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">Noch keine Kunden vorhanden</p>
            <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
            <div className="mt-4">
              <Button onClick={() => { /* Logic to open create form or scroll to it */ }} className="transition-colors duration-200">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ersten Kunden hinzufügen
              </Button>
            </div>
          </div>
        ) : customers.length === 0 && query ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">Keine Kunden gefunden</p>
            <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
          </div>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} className="shadow-elevation-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{customer.name}</CardTitle>
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

      <h2 className="text-2xl font-bold mt-8">Neuen Kunden hinzufügen</h2>
      <CustomerForm onSubmit={createCustomer} submitButtonText="Kunden hinzufügen" />
    </div>
  );
}