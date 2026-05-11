import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ObjectSummaryCard } from "@/components/object-summary-card";
import { ObjectDetailTabs } from "@/components/object-detail-tabs";
import { BackButtonWithParams } from "@/components/back-button-with-params";

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
    .select("*")
    .eq('id', id)
    .single();

  if (error || !object) {
    console.error("Fehler beim Laden des Objekts:", error?.message || "Objekt nicht gefunden");
    redirect("/dashboard/objects");
  }

  // Fetch related data separately (embedded joins require FK constraints that don't fully exist)
  const [{ data: customerRows }, { data: contactRows }, { data: orderRows }, { data: documentRows }] = await Promise.all([
    object.customer_id ? supabase.from("customers").select("name").eq("id", object.customer_id).limit(1) : Promise.resolve({ data: null }),
    object.customer_contact_id ? supabase.from("customer_contacts").select("first_name, last_name").eq("id", object.customer_contact_id).limit(1) : Promise.resolve({ data: null }),
    supabase.from("orders").select("id, key, title, status").eq("object_id", id),
    supabase.from("documents").select("id, name, file_url, created_at").eq("object_id", id),
  ]);

  // Flatten nested data for easier prop passing
  const flattenedObject = {
    ...object,
    customer_name: customerRows?.[0]?.name || null,
    object_leader_first_name: contactRows?.[0]?.first_name || null,
    object_leader_last_name: contactRows?.[0]?.last_name || null,
    orders: orderRows || [],
    documents: documentRows || [],
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={flattenedObject.name}>
          <BackButtonWithParams backUrl="/dashboard/objects" />
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
    </>
  );
}