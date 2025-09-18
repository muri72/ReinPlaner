import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerSummaryCard } from "@/components/customer-summary-card";
import { CustomerDetailTabs } from "@/components/customer-detail-tabs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !customer) {
    console.error("Fehler beim Laden des Kunden:", error?.message || "Kunde nicht gefunden");
    redirect("/dashboard/customers");
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title={customer.name}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/customers">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
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
  );
}