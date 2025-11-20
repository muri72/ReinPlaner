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

  // Fetch customer, their contacts, orders, and objects in one go
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*, customer_contacts(*), orders(*, objects(name)), objects(*)') // Fetch related contacts, orders, and objects
    .eq('id', id)
    .single();

  if (error || !customer) {
    console.error("Fehler beim Laden des Kunden:", error?.message || "Kunde nicht gefunden");
    redirect("/dashboard/customers");
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={customer.name}>
          <BackButtonWithParams backUrl="/dashboard/customers" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <CustomerSummaryCard customer={customer} />
          </div>
          <div className="lg:col-span-2">
            <CustomerDetailTabs customer={customer} />
          </div>
        </div>
      </div>
    </>
  );
}