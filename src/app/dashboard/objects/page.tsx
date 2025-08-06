import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObject } from "./actions";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { MapPin, FileText } from "lucide-react";

export default async function ObjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: objects, error } = await supabase
    .from('objects')
    .select(`
      *,
      customers ( name )
    `)
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Objekte:", error);
    return <div className="p-8">Fehler beim Laden der Objekte.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Objekte</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {objects.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">Noch keine Objekte vorhanden. Fügen Sie eines hinzu!</p>
        ) : (
          objects.map((object) => (
            <Card key={object.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{object.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <ObjectEditDialog object={object} />
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {object.customers && (
                  <p className="text-sm text-muted-foreground">Kunde: {object.customers.name}</p>
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