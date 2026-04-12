'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTenant, updateTenant } from '@/lib/actions/tenant-admin';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'pending' | 'cancelled';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  mode: 'create' | 'edit';
}

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  mode,
}: TenantFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: tenant?.slug || '',
    name: tenant?.name || '',
    domain: tenant?.domain || '',
    plan: tenant?.plan || 'starter',
  });

  // Update form when tenant changes
  useState(() => {
    if (tenant) {
      setFormData({
        slug: tenant.slug,
        name: tenant.name,
        domain: tenant.domain || '',
        plan: tenant.plan,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        const result = await createTenant({
          slug: formData.slug,
          name: formData.name,
          domain: formData.domain || undefined,
          plan: formData.plan as 'starter' | 'professional' | 'enterprise',
        });

        if (result.error) {
          toast.error(`Fehler: ${result.error}`);
        } else {
          toast.success(`Tenant "${formData.name}" erfolgreich erstellt`);
          router.refresh();
          onOpenChange(false);
        }
      } else if (tenant) {
        const result = await updateTenant(tenant.id, {
          name: formData.name,
          domain: formData.domain || null,
          plan: formData.plan as 'starter' | 'professional' | 'enterprise',
        });

        if (result.error) {
          toast.error(`Fehler: ${result.error}`);
        } else {
          toast.success(`Tenant "${formData.name}" erfolgreich aktualisiert`);
          router.refresh();
          onOpenChange(false);
        }
      }
    } catch (err) {
      toast.error(`Fehler: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from name if creating
    if (mode === 'create' && !formData.slug) {
      setFormData({
        ...formData,
        slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
    } else {
      setFormData({ ...formData, slug: value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Neuen Tenant erstellen' : `Tenant bearbeiten: ${tenant?.name}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Fülle das Formular aus, um einen neuen Tenant anzulegen.'
                : 'Aktualisiere die Tenant-Informationen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Firmenname *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (mode === 'create') {
                    handleSlugChange(e.target.value);
                  }
                }}
                placeholder="z.B. Muster Gebäudereinigung GmbH"
                required
              />
            </div>

            {/* Slug */}
            <div className="grid gap-2">
              <Label htmlFor="slug">Subdomain/Slug *</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="z.B. muster-cleaning"
                  required
                  pattern="[a-z0-9-]+"
                />
                <span className="text-muted-foreground text-sm">.reinplaner.de</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.
              </p>
            </div>

            {/* Custom Domain */}
            <div className="grid gap-2">
              <Label htmlFor="domain">Custom Domain (optional)</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="z.B. www.musterfirma.de"
                type="text"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Eigene Domain für diesen Tenant.
              </p>
            </div>

            {/* Plan */}
            <div className="grid gap-2">
              <Label htmlFor="plan">Plan *</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) =>
                  setFormData({ ...formData, plan: value as 'starter' | 'professional' | 'enterprise' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Plan auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">
                    <div className="flex flex-col items-start">
                      <span>Starter</span>
                      <span className="text-xs text-muted-foreground">Bis 5 Benutzer, €29/Monat</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex flex-col items-start">
                      <span>Professional</span>
                      <span className="text-xs text-muted-foreground">Bis 25 Benutzer, €79/Monat</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex flex-col items-start">
                      <span>Enterprise</span>
                      <span className="text-xs text-muted-foreground">Unbegrenzt, €199/Monat</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird gespeichert...' : mode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
