import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomerObject } from "./actions";
import { MapPin, FileText } from "lucide-react";

export default async function CustomerObjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the customer_id associated with the logged-in user
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!customer) {
    return <div className="p-8">Fehler: Es konnte kein zugehöriger Kunde für Ihr Konto gefunden werden.</div>;
  }

  const { data: objects, error } = await supabase
    .from('objects')
    .select('*')
    .eq('customer_id', customer.id)
    .order('name', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Kundenobjekte:", error);
    return <div className="p-8">Fehler beim Laden Ihrer Objekte.</div>;
  }

  const handleCreateObject = async (formData: any) => {
    "use server";
    return createCustomerObject(formData, customer.id);
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Meine Objekte</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Bestehende Objekte</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {objects.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Sie haben noch keine Objekte angelegt.</p>
            ) : (
              objects.map((object) => (
                <Card key={object.id}>
                  <CardHeader>
                    <CardTitle>{object.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{object.address}</span>
                    </div>
                    {object.description && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{object.description}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Neues Objekt hinzufügen</h2>
          <ObjectForm
            onSubmit={handleCreateObject}
            submitButtonText="Objekt hinzufügen"
            initialData={{ customerId: customer.id }}
          />
        </div>
      </div>
    </div>
  );
}