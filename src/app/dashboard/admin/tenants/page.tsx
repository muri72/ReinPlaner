'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenant, useTenantLimits } from '@/lib/tenant';

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

export default function AdminTenantsPage() {
  const { tenant: currentTenant } = useTenant();
  const limits = useTenantLimits();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demo - in production, this would come from API
  const mockTenants: Tenant[] = [
    {
      id: '1',
      slug: 'reinplaner',
      name: 'ReinPlaner',
      domain: 'reinplaner.de',
      plan: 'starter',
      status: 'active',
      settings: {},
      created_at: '2026-04-12T00:00:00Z',
      updated_at: '2026-04-12T00:00:00Z',
    },
  ];

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
      case 'starter': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Administration</h1>
          <p className="text-muted-foreground">Manage your tenants and their settings</p>
        </div>
        <Button>+ Add New Tenant</Button>
      </div>

      {/* Current Tenant Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Tenant</CardTitle>
          <CardDescription>You are currently working with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-medium">{currentTenant?.slug || 'reinplaner'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <Badge variant="outline">{currentTenant?.plan || 'starter'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor('active')}>Active</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Domain</p>
              <p className="font-medium">{currentTenant?.domain || 'reinplaner.de'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Limits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Plan Limits</CardTitle>
          <CardDescription>Resources available based on your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Max Users</p>
              <p className="text-2xl font-bold">{limits.maxUsers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Orders/Month</p>
              <p className="text-2xl font-bold">{limits.maxOrdersPerMonth}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage</p>
              <p className="text-2xl font-bold">{limits.storageMb} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>Overview of all registered tenants in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">Name</th>
                  <th className="py-3 px-4 text-left font-medium">Slug</th>
                  <th className="py-3 px-4 text-left font-medium">Domain</th>
                  <th className="py-3 px-4 text-left font-medium">Plan</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b">
                    <td className="py-3 px-4">{tenant.name}</td>
                    <td className="py-3 px-4 font-mono text-sm">{tenant.slug}</td>
                    <td className="py-3 px-4">{tenant.domain || '-'}</td>
                    <td className="py-3 px-4">
                      <Badge className={getPlanBadgeColor(tenant.plan)}>{tenant.plan}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(tenant.status)} text-white`}>
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold">{mockTenants.length}</CardTitle>
            <CardDescription>Total Tenants</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold">
              {mockTenants.filter(t => t.status === 'active').length}
            </CardTitle>
            <CardDescription>Active Tenants</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold">€0</CardTitle>
            <CardDescription>Monthly Revenue</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
