import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ObjectSummaryCard } from "@/components/object-summary-card";
import { ObjectDetailTabs } from "@/components/object-detail-tabs";

export default async function ObjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Await the params
  const { id } = await params;

  const { data: object, error } = await supabase
    .from('objects')
    .select(`
      *,
      customers ( name ),
      customer_contacts ( first_name, last_name ),
      orders ( *, objects(name) ),
      documents ( * )
    `)
    .eq('id', id)
    .single();

  if (error || !object) {
    console.error("Fehler beim Laden des Objekts:", error?.message || "Objekt nicht gefunden");
    redirect("/dashboard/objects");
  }

  // Flatten nested data for easier prop passing
  const flattenedObject = {
    ...object,
    customer_name: Array.isArray(object.customers) ? object.customers[0]?.name : object.customers?.name,
    object_leader_first_name: Array.isArray(object.customer_contacts) ? object.customer_contacts[0]?.first_name : object.customer_contacts?.first_name,
    object_leader_last_name: Array.isArray(object.customer_contacts) ? object.customer_contacts[0]?.last_name : object.customer_contacts?.last_name,
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title={flattenedObject.name}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/objects">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ObjectSummaryCard object={flattenedObject} />
        </div>
        <div className="lg:col-span-2">
          <ObjectDetailTabs object={flattenedObject} />
        </div>
      </div>
    </div>
  );
}