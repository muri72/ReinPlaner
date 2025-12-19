"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Plus, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
  color?: string | null;
}

interface ServiceCategory {
  id: string;
  key: string;
  title: string;
  description: string | null;
  display_order: number;
}

interface ServiceCreateEditDialogProps {
  service?: Service | null;
  categories: ServiceCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Feature {
  id: string;
  title: string;
  description?: string | null;
}

export function ServiceCreateEditDialog({
  service,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: ServiceCreateEditDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    key: "",
    title: "",
    short_description: "",
    description: "",
    category_id: "",
    base_price: "",
    default_hourly_rate: "",
    color: "#000000",
    is_active: true,
  });
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    if (service) {
      setFormData({
        key: service.key,
        title: service.title,
        short_description: service.short_description || "",
        description: service.description || "",
        category_id: service.category_id,
        base_price: service.base_price?.toString() || "",
        default_hourly_rate: service.default_hourly_rate?.toString() || "",
        color: (service as any).color || "#000000",
        is_active: service.is_active,
      });
      // Load features
      fetchFeatures(service.id);
    } else {
      setFormData({
        key: "",
        title: "",
        short_description: "",
        description: "",
        category_id: "",
        base_price: "",
        default_hourly_rate: "",
        color: "#000000",
        is_active: true,
      });
      setFeatures([]);
    }
  }, [service, open]);

  const fetchFeatures = async (serviceId: string) => {
    const { data, error } = await supabase
      .from('service_features')
      .select('*')
      .eq('service_id', serviceId)
      .order('display_order');

    if (error) {
      console.error("Fehler beim Laden der Features:", error);
      return;
    }

    setFeatures(data || []);
  };

  const generateKey = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      key: prev.key || generateKey(title),
    }));
  };

  const handleAddFeature = () => {
    setFeatures(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        title: "",
        description: "",
      },
    ]);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index: number, field: 'title' | 'description', value: string) => {
    setFeatures(prev => prev.map((feature, i) => {
      if (i === index) {
        return { ...feature, [field]: value };
      }
      return feature;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.key || !formData.category_id) {
        toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
        setLoading(false);
        return;
      }

      let serviceId = service?.id;

      if (service) {
        // Update existing service
        const { error: updateError } = await supabase
          .from('services')
          .update({
            key: formData.key,
            title: formData.title,
            short_description: formData.short_description || null,
            description: formData.description || null,
            category_id: formData.category_id,
            base_price: formData.base_price ? parseFloat(formData.base_price) : null,
            default_hourly_rate: formData.default_hourly_rate ? parseFloat(formData.default_hourly_rate) : null,
            color: formData.color,
            is_active: formData.is_active,
          })
          .eq('id', service.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new service
        const { data: newService, error: insertError } = await supabase
          .from('services')
          .insert({
            key: formData.key,
            title: formData.title,
            short_description: formData.short_description || null,
            description: formData.description || null,
            category_id: formData.category_id,
            base_price: formData.base_price ? parseFloat(formData.base_price) : null,
            default_hourly_rate: formData.default_hourly_rate ? parseFloat(formData.default_hourly_rate) : null,
            color: formData.color,
            is_active: formData.is_active,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        serviceId = newService.id;
      }

      // Handle features
      if (serviceId) {
        // Delete existing features if updating
        if (service) {
          const { error: deleteError } = await supabase
            .from('service_features')
            .delete()
            .eq('service_id', serviceId);

          if (deleteError) {
            throw deleteError;
          }
        }

        // Insert new features
        const featuresToInsert = features
          .filter(f => f.title.trim())
          .map((feature, index) => ({
            service_id: serviceId,
            title: feature.title,
            description: feature.description || null,
            display_order: index,
          }));

        if (featuresToInsert.length > 0) {
          const { error: featuresError } = await supabase
            .from('service_features')
            .insert(featuresToInsert);

          if (featuresError) {
            throw featuresError;
          }
        }
      }

      toast.success(service ? "Service aktualisiert" : "Service erstellt");
      onSuccess();
    } catch (error: any) {
      console.error("Fehler beim Speichern:", error);
      toast.error(error.message || "Fehler beim Speichern des Services");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card">
        <DialogHeader>
          <DialogTitle>{service ? "Service bearbeiten" : "Neuen Service erstellen"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="z.B. Büroreinigung"
                required
              />
            </div>

            <div>
              <Label htmlFor="key">Schlüssel (eindeutig) *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                placeholder="z.B. bueroreinigung"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Kategorie *</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie auswählen" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="short_description">Kurzbeschreibung</Label>
            <Input
              id="short_description"
              value={formData.short_description}
              onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
              placeholder="Kurze Beschreibung für die Übersicht"
            />
          </div>

          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detaillierte Beschreibung"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_price">Basispreis (€)</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                placeholder="z.B. 100.00"
              />
            </div>

            <div>
              <Label htmlFor="default_hourly_rate">Stundensatz (€/h)</Label>
              <Input
                id="default_hourly_rate"
                type="number"
                step="0.01"
                value={formData.default_hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, default_hourly_rate: e.target.value }))}
                placeholder="z.B. 45.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="color">Farbe</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#000000"
                className="flex-1"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Service ist aktiv</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                <Plus className="mr-2 h-4 w-4" />
                Feature hinzufügen
              </Button>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={feature.id} className="flex items-start gap-2 p-2 border rounded">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={feature.title}
                      onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                      placeholder="Feature-Titel"
                    />
                    <Input
                      value={feature.description || ""}
                      onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                      placeholder="Beschreibung (optional)"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFeature(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form >
      </DialogContent >
    </Dialog >
  );
}
