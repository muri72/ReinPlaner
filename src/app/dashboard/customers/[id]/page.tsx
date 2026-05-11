import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerSummaryCard } from "@/components/customer-summary-card";
import { CustomerDetailTabs } from "@/components/customer-detail-tabs";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Await params to get the id
  const { id } = await params;

  // Fetch customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (customerError || !customer) {
    console.error("Fehler beim Laden des Kunden:", customerError?.message || "Kunde nicht gefunden");
    redirect("/dashboard/customers");
  }

  // Fetch related data separately (avoid embedded joins — PostgREST requires FK constraints which objects.customers and customer_contacts.customers don't have)
  const [contactsResult, ordersResult, objectsResult] = await Promise.all([
    supabase.from('customer_contacts').select('*').eq('customer_id', id).order('last_name', { ascending: true }),
    supabase.from('orders').select('id, title, status, order_type, due_date, start_date, recurring_end_date, object_id').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('objects').select('id, name, address, priority').eq('customer_id', id).order('name', { ascending: true }),
  ]);

  // Enrich orders with object names (manual join since PostgREST embedded join on objects.name requires FK which orders.object_id→objects has, but objects.customer_id→customers does NOT)
  const orderIds = ordersResult.data?.map(o => o.object_id).filter(Boolean) || [];
  let objectNames: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: objectsData } = await supabase.from('objects').select('id, name').in('id', orderIds);
    objectNames = Object.fromEntries((objectsData || []).map(o => [o.id, o.name]));
  }
  const orders = (ordersResult.data || []).map(o => ({
    ...o,
    objects: o.object_id ? { name: objectNames[o.object_id] || null } : null,
  }));

  const enrichedCustomer = {
    ...customer,
    customer_contacts: contactsResult.data || [],
    orders,
    objects: objectsResult.data || [],
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={enrichedCustomer.name}>
          <BackButtonWithParams backUrl="/dashboard/customers" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <CustomerSummaryCard customer={enrichedCustomer} />
          </div>
          <div className="lg:col-span-2">
            <CustomerDetailTabs customer={enrichedCustomer} />
          </div>
        </div>
      </div>
    </>
  );
}