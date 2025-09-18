import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFinancialOverview } from "./actions";
import { FinancialSummaryCard } from "@/components/financial-summary-card";
import { ServiceRateManager } from "@/components/service-rate-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderFinancialsAnalysis } from "@/components/order-financials-analysis";
import { DefaultRateManager } from "@/components/default-rate-manager";
import { PersonnelCostAnalysis } from "@/components/personnel-cost-analysis";

export default async function FinancesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) { // Added error logging for profile fetching
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
  }

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    redirect("/dashboard");
  }

  const now = new Date();
  const { data: financialData, message: overviewMessage, success: overviewSuccess } = await getFinancialOverview(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Finanzübersicht</h1>
      
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monatsübersicht</CardTitle>
          <CardDescription className="text-sm">
            Eine Zusammenfassung Ihrer Finanzen für den aktuellen Monat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewSuccess && financialData ? (
            <div className="grid gap-4 md:gap-6 md:grid-cols-3">
              <FinancialSummaryCard title="Einnahmen" value={financialData.totalRevenue} />
              <FinancialSummaryCard title="Personalkosten" value={financialData.totalCosts} isCost />
              <FinancialSummaryCard title="Gewinn" value={financialData.profit} isProfit />
            </div>
          ) : (
            <p className="text-destructive text-sm">
              {overviewMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Rentabilitätsanalyse pro Auftrag</CardTitle>
          <CardDescription className="text-sm">
            Wählen Sie einen Monat aus, um eine detaillierte Aufschlüsselung der Finanzen für jeden Auftrag in diesem Zeitraum anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderFinancialsAnalysis />
        </CardContent>
      </Card>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Personalkosten-Analyse</CardTitle>
          <CardDescription className="text-sm">
            Detaillierte Aufschlüsselung der Personalkosten pro Mitarbeiter für den ausgewählten Monat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonnelCostAnalysis />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Stundensätze verwalten</CardTitle>
            <CardDescription className="text-sm">
              Legen Sie hier die Netto-Stundensätze für Ihre verschiedenen Dienstleistungen fest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceRateManager />
          </CardContent>
        </Card>
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Standard-Mitarbeiterstundenlohn</CardTitle>
            <CardDescription className="text-sm">
              Dieser Wert wird verwendet, wenn für einen Mitarbeiter kein individueller Stundenlohn hinterlegt ist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DefaultRateManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}