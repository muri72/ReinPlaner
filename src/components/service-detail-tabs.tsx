"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, List, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ServiceFeature {
  id: string;
  title: string;
  description: string | null;
  price_modifier?: number | null;
}

interface Service {
  id: string;
  key: string;
  title: string;
  short_description: string | null;
  description: string | null;
  category_id: string;
  base_price: number | null;
  default_hourly_rate: number | null;
  is_active: boolean;
  color: string | null;
  category?: {
    id: string;
    key: string;
    title: string;
  };
  features?: ServiceFeature[];
}

interface ServiceDetailTabsProps {
  service: Service;
  currentUserRole: "admin" | "manager" | "employee" | "customer" | "platform_admin";
  onUpdate?: () => void;
}

export function ServiceDetailTabs({
  service,
  currentUserRole,
  onUpdate,
}: ServiceDetailTabsProps) {
  const [isActive, setIsActive] = useState(service.is_active);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const isAdmin = currentUserRole === "admin";

  const handleToggleActive = async () => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("services")
      .update({ is_active: !isActive })
      .eq("id", service.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    } else {
      toast.success(isActive ? "Service deaktiviert" : "Service aktiviert");
      setIsActive(!isActive);
      onUpdate?.();
    }
    setIsSubmitting(false);
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        <TabsTrigger value="features">
          Features
          {service.features && service.features.length > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs">
              {service.features.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="pricing">Preise</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {service.color && (
                  <div
                    className="h-6 w-6 rounded-full border border-border/50"
                    style={{ backgroundColor: service.color }}
                  />
                )}
                <div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>
                    {service.category?.title || "Keine Kategorie"}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Aktiv" : "Inaktiv"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {service.short_description && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Kurzbeschreibung:
                </span>
                <p className="mt-1">{service.short_description}</p>
              </div>
            )}

            {service.description && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Beschreibung:
                </span>
                <p className="mt-1 whitespace-pre-wrap">{service.description}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Service-Schlüssel:</span>{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {service.key}
                </code>
              </div>
              {service.category && (
                <div>
                  <span className="text-muted-foreground">Kategorie:</span>{" "}
                  {service.category.title}
                </div>
              )}
            </div>

            {isAdmin && (
              <>
                <Separator />
                <div className="flex space-x-2">
                  <Button
                    variant={isActive ? "outline" : "default"}
                    onClick={handleToggleActive}
                    disabled={isSubmitting}
                  >
                    {isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="features">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              {service.features?.length || 0} Feature(s) in diesem Service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {service.features && service.features.length > 0 ? (
              <div className="space-y-4">
                {service.features.map((feature) => (
                  <div
                    key={feature.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="font-medium">{feature.title}</span>
                      </div>
                      {feature.price_modifier != null && feature.price_modifier !== 0 && (
                        <Badge variant="outline" className="text-xs">
                          {feature.price_modifier > 0 ? "+" : ""}
                          {feature.price_modifier.toFixed(2)} €
                        </Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground pl-6">
                        {feature.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <List className="mx-auto h-10 w-10 mb-4 text-muted-foreground" />
                <p>Keine Features für diesen Service definiert.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pricing">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Preise</CardTitle>
            <CardDescription>Preisinformationen für diesen Service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-4 text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">Basispreis</span>
                </div>
                <p className="text-3xl font-bold">
                  {service.base_price != null
                    ? `${service.base_price.toFixed(2)} €`
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Fixpreis pro Auftrag</p>
              </div>

              <div className="border rounded-lg p-4 text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">Stundensatz</span>
                </div>
                <p className="text-3xl font-bold">
                  {service.default_hourly_rate != null
                    ? `${service.default_hourly_rate.toFixed(2)} €`
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Pro Stunde</p>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>
                Der endgültige Preis kann je nach Auftrag und Kunde abweichen.
                Aufschläge und individuelle Vereinbarungen werden separat berechnet.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}