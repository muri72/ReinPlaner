import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObject } from "./actions";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { MapPin, FileText } from "lucide-react";
import { SearchInput } from "@/components/search-input";

// Definieren Sie die Schnittstelle für die Objekt-Daten, wie sie auf dieser Seite verwendet werden
interface DisplayObject {
  id: string;
  user_id: string | null;
  customer_id: string;
  name: string;
  address: string;
  description: string | null;
  created_at: string | null;
  customer_name: string | null; // Dieses Feld kommt entweder vom RPC oder vom Join
}

export default async function ObjectsPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let objects: DisplayObject[] | null; // Typ für die Objekte deklarieren
  let error: any; // Typ für Fehler deklarieren

  if (query) {
    // Verwende die neue RPC-Funktion für die Suche
    const { data, error: rpcError } = await supabase.rpc('search_objects', {
      search_query: query,
      user_id_param: user.id,
    });
    objects = data as DisplayObject[] | null; // Daten zu DisplayObject[] casten
    error = rpcError;
  } else {
    // Normale Abfrage, wenn kein Suchbegriff vorhanden ist
    const { data, error: selectError } = await supabase
      .from('objects')
      .select(`
        *,
        customers ( name )
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    // Daten mappen, um sie an die DisplayObject-Schnittstelle anzupassen
    objects = data?.map(obj => ({
      id: obj.id,
      user_id: obj.user_id,
      customer_id: obj.customer_id,
      name: obj.name,
      address: obj.address,
      description: obj.description,
      created_at: obj.created_at,
      customer_name: obj.customers?.name || null, // Zugriff auf den Namen des Kunden
    })) || null;
    error = selectError;
  }

  if (error) {
    console.error("Fehler beim Laden der Objekte:", error);
    return <div className="p-8">Fehler beim Laden der Objekte.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Objekte</h1>

      <div className="mb-4">
        <SearchInput placeholder="Objekte suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {objects && objects.length === 0 ? ( // Überprüfen, ob objects nicht null ist
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Objekte gefunden, die Ihrer Suche entsprechen." : "Noch keine Objekte vorhanden. Fügen Sie eines hinzu!"}
          </p>
        ) : (
          objects?.map((object) => ( // 'object' ist jetzt typisiert
            <Card key={object.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{object.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <ObjectEditDialog object={object} />
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {object.customer_name && (
                  <p className="text-sm text-muted-foreground">Kunde: {object.customer_name}</p>
                )}
                {object.address && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{object.address}</span>
                  </div>
                )}
                {object.description && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{object.description}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neues Objekt hinzufügen</h2>
      <ObjectForm onSubmit={createObject} submitButtonText="Objekt hinzufügen" />
    </div>
  );
}