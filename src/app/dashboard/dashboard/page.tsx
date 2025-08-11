import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { signOut } from "@/app/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, Clock } from "lucide-react";
import { OrderStatusChart } from "@/components/order-status-chart";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profildaten abrufen
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, email_notifications_enabled')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Fehler beim Laden des Profils:", profileError);
  }

  // Daten für das Dashboard abrufen
  const { count: customerCount, error: customerError } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  const { count: objectCount, error: objectError } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true });

  const { count: employeeCount, error: employeeError } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  const { count: pendingOrderCount, error: pendingOrderError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Daten für die Auftragsstatus-Grafik abrufen
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('status');

  if (customerError) console.error("Fehler beim Laden der Kundenzahl:", customerError);
  if (objectError) console.error("Fehler beim Laden der Objektzahl:", objectError);
  if (employeeError) console.error("Fehler beim Laden der Mitarbeiterzahl:", employeeError);
  if (pendingOrderError) console.error("Fehler beim Laden der ausstehenden Aufträge:", pendingOrderError);
  if (ordersError) console.error("Fehler beim Laden der Auftragsstatusdaten:", ordersError);

  // Auftragsstatus-Zählungen für die Grafik aufbereiten
  const statusCounts = ordersData?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const chartData = [
    { name: 'Ausstehend', value: statusCounts['pending'] || 0 },
    { name: 'In Bearbeitung', value: statusCounts['in_progress'] || 0 },
    { name: 'Abgeschlossen', value: statusCounts['completed'] || 0 },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">
        Willkommen im Dashboard, {profile?.first_name || user.email}!
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Gesamtkunden</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{customerCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Kunden in Ihrem System</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Gesamtobjekte</CardTitle>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{objectCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Objekte, die Sie verwalten</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Gesamte Mitarbeiter</CardTitle>
            <UsersRound className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{employeeCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Mitarbeiter in Ihrem Team</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Ausstehende Aufträge</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{pendingOrderCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Aufträge, die noch bearbeitet werden müssen</p>
          </CardContent>
        </Card>
      </div>

      {/* Neue Sektion für die Grafik */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-8">
        <OrderStatusChart data={chartData} />
      </div>

      <h2 className="text-2xl font-bold mt-8">Ihr Profil</h2>
      {profile?.first_name && profile?.last_name && (
        <p className="text-base">
          Ihr vollständiger Name: {profile.first_name} {profile.last_name}
        </p>
      )}
      <ProfileUpdateForm
        initialData={{
          firstName: profile?.first_name || null,
          lastName: profile?.last_name || null,
          avatarUrl: profile?.avatar_url || null,
          emailNotificationsEnabled: profile?.email_notifications_enabled ?? true,
        }}
      />

      <form action={signOut} className="mt-8">
        <Button type="submit">Abmelden</Button>
      </form>
      <MadeWithDyad />
    </div>
  );
}