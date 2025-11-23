"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";

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
}

interface ServiceCategory {
  id: string;
  key: string;
  title: string;
  description: string | null;
  display_order: number;
}

interface ServiceCategoryProps {
  category: ServiceCategory;
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
  onToggleActive: (service: Service) => void;
}

export function ServiceCategory({
  category,
  services,
  onEdit,
  onDelete,
  onToggleActive,
}: ServiceCategoryProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-xl">{category.title}</CardTitle>
        {category.description && (
          <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {services.map(service => (
            <div key={service.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{service.title}</h4>
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
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(service)}
                  title="Bearbeiten"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(service.id)}
                  className="text-destructive hover:text-destructive"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
