'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenantFormDialog } from '@/components/tenant-form-dialog';
import { TenantDomainDialog } from '@/components/tenant-domain-dialog';
import { activateTenant, suspendTenant, deleteTenant } from '@/lib/actions/tenant-admin';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  pendingTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
}

interface TenantManagementClientProps {
  initialTenants: Tenant[];
  initialStats: PlatformStats | null;
  error: string | null;
}

export function TenantManagementClient({
  initialTenants,
  initialStats,
  error,
}: TenantManagementClientProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [stats, setStats] = useState<PlatformStats | null>(initialStats);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [domainTenant, setDomainTenant] = useState<Tenant | null>(null);
  const [domainOpen, setDomainOpen] = useState(false);

  const handleStatusChange = async (
    tenantId: string,
    action: 'activate' | 'suspend' | 'delete'
  ) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const confirmMessage = {
      activate: `Möchtest du "${tenant.name}" wirklich aktivieren?`,
      suspend: `Möchtest du "${tenant.name}" wirklich suspendieren?`,
      delete: `Möchtest du "${tenant.name}" wirklich löschen (Soft-Delete)?`,
    }[action];

    if (!confirm(confirmMessage)) return;

    try {
      let result;
      switch (action) {
        case 'activate':
          result = await activateTenant(tenantId);
          if (result.success) {
            toast.success(`"${tenant.name}" wurde aktiviert`);
          }
          break;
        case 'suspend':
          result = await suspendTenant(tenantId);
          if (result.success) {
            toast.success(`"${tenant.name}" wurde suspendiert`);
          }
          break;
        case 'delete':
          result = await deleteTenant(tenantId);
          if (result.success) {
            toast.success(`"${tenant.name}" wurde gelöscht`);
          }
          break;
      }

      if (result?.error) {
        toast.error(`Fehler: ${result.error}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(`Fehler: ${(err as Error).message}`);
    }
  };

  const getStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'suspended': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanBadgeColor = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'starter': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'enterprise': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: de });
    } catch {
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-600">Fehler beim Laden</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.refresh()}>Erneut versuchen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Administration</h1>
          <p className="text-muted-foreground">Verwalte alle Tenants und ihre Einstellungen</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Neuen Tenant erstellen</Button>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold">{stats.totalTenants}</CardTitle>
              <CardDescription>Alle Tenants</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold text-green-600">{stats.activeTenants}</CardTitle>
              <CardDescription>Aktive Tenants</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold text-yellow-600">{stats.pendingTenants}</CardTitle>
              <CardDescription>Wartende Tenants</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold">€{stats.monthlyRevenue.toLocaleString()}</CardTitle>
              <CardDescription>Monatlicher Umsatz</CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Current Tenant Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dein aktueller Tenant</CardTitle>
          <CardDescription>Informationen über den Tenant, in dem du gerade arbeitest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-medium font-mono">reinplaner</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <Badge variant="outline">Starter</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={`${getStatusColor('active')} text-white`}>Active</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Domain</p>
              <p className="font-medium">reinplaner.de</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Tenants</CardTitle>
          <CardDescription>Übersicht aller registrierten Tenants auf der Plattform</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Keine Tenants vorhanden.</p>
              <Button onClick={() => setCreateOpen(true)}>+ Ersten Tenant erstellen</Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium">Name</th>
                    <th className="py-3 px-4 text-left font-medium">Slug</th>
                    <th className="py-3 px-4 text-left font-medium">Domain</th>
                    <th className="py-3 px-4 text-left font-medium">Plan</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">Erstellt</th>
                    <th className="py-3 px-4 text-left font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b">
                      <td className="py-3 px-4 font-medium">{tenant.name}</td>
                      <td className="py-3 px-4 font-mono text-sm">{tenant.slug}</td>
                      <td className="py-3 px-4 text-sm">
                        {tenant.domain || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPlanBadgeColor(tenant.plan)}>{tenant.plan}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getStatusColor(tenant.status)} text-white`}>
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(tenant.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTenant(tenant);
                              setEditOpen(true);
                            }}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDomainTenant(tenant);
                              setDomainOpen(true);
                            }}
                          >
                            Domain
                          </Button>
                          {tenant.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleStatusChange(tenant.id, 'activate')}
                            >
                              Aktivieren
                            </Button>
                          )}
                          {tenant.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600"
                              onClick={() => handleStatusChange(tenant.id, 'suspend')}
                            >
                              Suspendieren
                            </Button>
                          )}
                          {tenant.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleStatusChange(tenant.id, 'delete')}
                            >
                              Löschen
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <TenantFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      {/* Edit Tenant Dialog */}
      <TenantFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tenant={editTenant}
        mode="edit"
      />

      {/* Custom Domain Dialog */}
      {domainTenant && (
        <TenantDomainDialog
          open={domainOpen}
          onOpenChange={setDomainOpen}
          tenantId={domainTenant.id}
          tenantName={domainTenant.name}
        />
      )}
    </div>
  );
}
