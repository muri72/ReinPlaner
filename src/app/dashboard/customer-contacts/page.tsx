import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerContactForm } from "@/components/customer-contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomerContact } from "./actions";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { Mail, Phone, Briefcase, UserRound } from "lucide-react";
import { SearchInput } from "@/components/search-input";

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  // Kunden-IDs des aktuellen Benutzers abrufen
  const { data: customerIds, error: customerIdsError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id);

  if (customerIdsError) {
    console.error("Fehler beim Abrufen der Kunden-IDs:", customerIdsError);
    return <div className="p-8">Fehler beim Laden der Kundenkontakte.</div>;
  }

  const allowedCustomerIds = customerIds.map(c => c.id);

  let customerContactsQuery = supabase
    .from('customer_contacts')
    .select(`
      *,
      customers ( name )
    `)
    .in('customer_id', allowedCustomerIds) // Korrigiert: Übergabe eines Arrays von IDs
    .order('last_name', { ascending: true });

  if (query) {
    customerContactsQuery = customerContactsQuery.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,role.ilike.%${query}%,customers.name.ilike.%${query}%`
    );
  }

  const { data: contacts, error } = await customerContactsQuery;

  if (error) {
    console.error("Fehler beim Laden der Kundenkontakte:", error);
    return <div className="p-8">Fehler beim Laden der Kundenkontakte.</div>;
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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Kundenkontakte</h1>

      <div className="mb-4">
        <SearchInput placeholder="Kundenkontakte suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayContacts.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Kundenkontakte gefunden, die Ihrer Suche entsprechen." : "Noch keine Kundenkontakte vorhanden. Fügen Sie einen hinzu!"}
          </p>
        ) : (
          displayContacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{contact.first_name} {contact.last_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <CustomerContactEditDialog contact={contact} />
                  <DeleteCustomerContactButton contactId={contact.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.customer_name && (
                  <p className="text-sm text-muted-foreground">Kunde: {contact.customer_name}</p>
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

      <h2 className="text-2xl font-bold mt-8">Neuen Kundenkontakt hinzufügen</h2>
      <CustomerContactForm onSubmit={createCustomerContact} submitButtonText="Kundenkontakt hinzufügen" />
    </div>
  );
}