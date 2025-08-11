import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServiceRequestForm } from "@/components/service-request-form";

export default async function NewRequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // We need to find the customer_id and potential customer_contact_id for the logged-in user
  const { data: customerContact } = await supabase
    .from('customer_contacts')
    .select('id, customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId: string | null = customerContact?.customer_id || null;
  const customerContactId: string | null = customerContact?.id || null;

  // If user is not a contact, they might be the main customer user
  if (!customerId) {
      const { data: mainCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      customerId = mainCustomer?.id || null;
  }

  if (!customerId) {
      return <div className="p-8 text-sm">Fehler: Es konnte kein zugehöriger Kunde für Ihr Benutzerkonto gefunden werden.</div>;
  }

  // Fetch objects associated with this customer
  const { data: objects, error: objectsError } = await supabase
    .from('objects')
    .select('id, name')
    .eq('customer_id', customerId);

  if (objectsError) {
    return <div className="p-8 text-sm">Fehler beim Laden Ihrer Objekte.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Neue Service-Anfrage stellen</h1>
      <p className="text-base text-muted-foreground">
        Beschreiben Sie uns Ihr Anliegen und wir werden uns umgehend darum kümmern.
      </p>
      <div className="max-w-2xl">
        <ServiceRequestForm 
            objects={objects || []} 
            customerContactId={customerContactId}
            customerId={customerId}
        />
      </div>
    </div>
  );
}