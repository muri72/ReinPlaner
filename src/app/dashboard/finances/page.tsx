import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFinancialOverview } from "@/lib/actions/finances";
import { FinancialSummaryCard } from "@/components/financial-summary-card";
import { ServiceRateManager } from "@/components/service-rate-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FinancesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    redirect("/dashboard");
  }

  const now = new Date();
  const { data: financialData, message, success } = await getFinancialOverview(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Finanzübersicht</h1>
      <p className="text-muted-foreground">
        Hier finden Sie eine Übersicht über Ihre Einnahmen, Kosten und den daraus resultierenden Gewinn für den aktuellen Monat.
      </p>

      {success && financialData ? (
        <div className="grid gap-6 md:grid-cols-3">
          <FinancialSummaryCard title="Einnahmen" value={financialData.totalRevenue} />
          <FinancialSummaryCard title="Personalkosten" value={financialData.totalCosts} isCost />
          <FinancialSummaryCard title="Gewinn" value={financialData.profit} isProfit />
        </div>
      ) : (
        <p className="text-destructive">{message}</p>
      )}

      <div className="grid grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Stundensätze verwalten</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceRateManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}