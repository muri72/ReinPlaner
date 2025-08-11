import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFinancialOverview, getFinancialsForAllOrders } from "@/lib/actions/finances";
import { FinancialSummaryCard } from "@/components/financial-summary-card";
import { ServiceRateManager } from "@/components/service-rate-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderFinancialsTable } from "@/components/order-financials-table";

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
  const financialOverviewPromise = getFinancialOverview(now.getFullYear(), now.getMonth() + 1);
  const allOrdersFinancialsPromise = getFinancialsForAllOrders();

  const [
    { data: financialData, message: overviewMessage, success: overviewSuccess },
    { data: allOrdersData, message: allOrdersMessage, success: allOrdersSuccess }
  ] = await Promise.all([financialOverviewPromise, allOrdersFinancialsPromise]);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Finanzübersicht</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Monatsübersicht</CardTitle>
          <CardDescription>
            Eine Zusammenfassung Ihrer Finanzen für den aktuellen Monat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewSuccess && financialData ? (
            <div className="grid gap-6 md:grid-cols-3">
              <FinancialSummaryCard title="Einnahmen" value={financialData.totalRevenue} />
              <FinancialSummaryCard title="Personalkosten" value={financialData.totalCosts} isCost />
              <FinancialSummaryCard title="Gewinn" value={financialData.profit} isProfit />
            </div>
          ) : (
            <p className="text-destructive">{overviewMessage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rentabilitätsanalyse pro Auftrag</CardTitle>
          <CardDescription>
            Eine detaillierte Aufschlüsselung der Finanzen für jeden einzelnen Auftrag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allOrdersSuccess && allOrdersData ? (
            <OrderFinancialsTable data={allOrdersData} />
          ) : (
            <p className="text-destructive">{allOrdersMessage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stundensätze verwalten</CardTitle>
          <CardDescription>
            Legen Sie hier die Netto-Stundensätze für Ihre verschiedenen Dienstleistungen fest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceRateManager />
        </CardContent>
      </Card>
    </div>
  );
}