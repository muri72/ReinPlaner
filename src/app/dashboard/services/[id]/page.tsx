import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";
import { ServiceDetailTabs } from "@/components/service-detail-tabs";
import { Badge } from "@/components/ui/badge";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch user profile for role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentUserRole = profile?.role || "employee";

  // Only admins can access service details
  if (currentUserRole !== "admin") {
    redirect("/dashboard/services");
  }

  // Fetch service
  const { data: service, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !service) {
    console.error(
      "Fehler beim Laden des Services:",
      error?.message || "Service nicht gefunden"
    );
    redirect("/dashboard/services");
  }

  // Fetch category and features separately (embedded joins require FK constraints that don't exist)
  const { data: categoryRows } = await supabase
    .from("service_categories")
    .select("id, key, title")
    .eq("id", service.category_id)
    .limit(1);

  const { data: featureRows } = await supabase
    .from("service_features")
    .select("id, title, description, price_modifier")
    .eq("service_id", id);

  // Transform the data to match the expected format
  const transformedService = {
    ...service,
    category: categoryRows?.[0] || null,
    features: featureRows || [],
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={transformedService.title}>
          <BackButtonWithParams backUrl="/dashboard/services" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                {transformedService.color && (
                  <div
                    className="h-5 w-5 rounded-full border border-border/50"
                    style={{ backgroundColor: transformedService.color }}
                  />
                )}
                <Badge variant={transformedService.is_active ? "default" : "secondary"}>
                  {transformedService.is_active ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>

              {transformedService.category && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Kategorie:</span>{" "}
                  {transformedService.category.title}
                </div>
              )}

              {transformedService.base_price != null && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Basispreis:</span>{" "}
                  <span className="font-semibold">
                    {transformedService.base_price.toFixed(2)} €
                  </span>
                </div>
              )}

              {transformedService.default_hourly_rate != null && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Stundensatz:</span>{" "}
                  <span className="font-semibold">
                    {transformedService.default_hourly_rate.toFixed(2)} €/h
                  </span>
                </div>
              )}

              <div className="text-sm">
                <span className="text-muted-foreground">Features:</span>{" "}
                <span className="font-semibold">
                  {transformedService.features?.length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ServiceDetailTabs
              service={transformedService}
              currentUserRole={currentUserRole as any}
            />
          </div>
        </div>
      </div>
    </>
  );
}