"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Eye } from "lucide-react";
import { ServiceCreateEditDialog } from "@/components/service-create-edit-dialog";
import { ServiceCategory } from "@/components/service-category";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  features?: {
    id: string;
    title: string;
    description: string | null;
  }[];
}

interface ServiceCategory {
  id: string;
  key: string;
  title: string;
  description: string | null;
  display_order: number;
}

export default function ServicesPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
    }

    const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
    setCurrentUserRole(role);

    // Only admins can access this page
    if (role !== 'admin') {
      redirect("/forbidden");
      return;
    }

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('service_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (categoriesError) {
      console.error("Fehler beim Laden der Service-Kategorien:", categoriesError);
    }

    // Fetch services with their categories and features
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select(`
        *,
        service_categories (
          id,
          key,
          title
        ),
        service_features (
          id,
          title,
          description
        )
      `)
      .order('title', { ascending: true });

    if (servicesError) {
      console.error("Fehler beim Laden der Services:", servicesError);
    }

    // Transform the data
    const transformedServices = (servicesData || []).map(service => ({
      ...service,
      category: service.service_categories,
      features: service.service_features,
    }));

    setCategories(categoriesData || []);
    setServices(transformedServices);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateService = () => {
    setSelectedService(null);
    setIsEditing(false);
    setShowDialog(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Service löschen möchten?")) {
      return;
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error("Fehler beim Löschen des Services:", error);
      alert("Fehler beim Löschen des Services");
      return;
    }

    // Refresh the data
    fetchData();
  };

  const handleToggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (error) {
      console.error("Fehler beim Aktualisieren des Services:", error);
      alert("Fehler beim Aktualisieren des Services");
      return;
    }

    // Refresh the data
    fetchData();
  };

  const filteredServices = selectedCategory
    ? services.filter(s => s.category_id === selectedCategory)
    : services;

  if (!currentUser || currentUserRole !== 'admin') {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <Card className="glassmorphism-card">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold">Zugriff verweigert</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sie haben keine Berechtigung, diese Seite zu besuchen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title="Service-Verwaltung">
        <Button onClick={handleCreateService} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Neuer Service
        </Button>
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Services verwalten</CardTitle>
          <CardDescription>
            Verwalten Sie Ihre angebotenen Dienstleistungen, Preise und Features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted/60 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <Tabs value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Alle Services ({services.length})</TabsTrigger>
                {categories.map(category => {
                  const count = services.filter(s => s.category_id === category.id).length;
                  return (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.title} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <div className="space-y-4">
                  {categories.map(category => {
                    const categoryServices = services.filter(s => s.category_id === category.id);
                    if (categoryServices.length === 0) return null;

                    return (
                      <ServiceCategory
                        key={category.id}
                        category={category}
                        services={categoryServices}
                        onEdit={handleEditService}
                        onDelete={handleDeleteService}
                        onToggleActive={handleToggleActive}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              {categories.map(category => (
                <TabsContent key={category.id} value={category.id} className="mt-0">
                  <div className="space-y-4">
                    {filteredServices.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Keine Services in dieser Kategorie gefunden.</p>
                      </div>
                    ) : (
                      filteredServices.map(service => (
                        <Card key={service.id} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {service.color && (
                                  <div
                                    className="h-4 w-4 rounded-full border border-border"
                                    style={{ backgroundColor: service.color }}
                                  />
                                )}
                                <h3 className="font-semibold text-lg">{service.title}</h3>
                                <Badge variant={service.is_active ? "default" : "secondary"}>
                                  {service.is_active ? "Aktiv" : "Inaktiv"}
                                </Badge>
                              </div>
                              {service.short_description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.short_description}
                                </p>
                              )}
                              <div className="flex gap-4 mt-2 text-sm">
                                {service.base_price && (
                                  <span className="text-muted-foreground">
                                    Basispreis: <span className="font-semibold text-foreground">{service.base_price.toFixed(2)} €</span>
                                  </span>
                                )}
                                {service.default_hourly_rate && (
                                  <span className="text-muted-foreground">
                                    Stundensatz: <span className="font-semibold text-foreground">{service.default_hourly_rate.toFixed(2)} €/h</span>
                                  </span>
                                )}
                              </div>
                              {service.features && service.features.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {service.features.map(feature => (
                                    <Badge key={feature.id} variant="outline" className="text-xs">
                                      {feature.title}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditService(service)}
                                title="Bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteService(service.id)}
                                className="text-destructive hover:text-destructive"
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {showDialog && (
        <ServiceCreateEditDialog
          service={selectedService}
          categories={categories}
          open={showDialog}
          onOpenChange={setShowDialog}
          onSuccess={() => {
            setShowDialog(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
