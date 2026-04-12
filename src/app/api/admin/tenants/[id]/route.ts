/**
 * Admin Tenant Management API Route - Individual Tenant
 * 
 * RESTful API for single tenant operations.
 * All endpoints require admin authentication.
 * 
 * GET    /api/admin/tenants/:id - Get single tenant
 * PATCH  /api/admin/tenants/:id - Update tenant
 * DELETE /api/admin/tenants/:id - Delete tenant
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { TenantPlan, TenantStatus } from '@/lib/tenant/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if the current user has platform admin role
 */
async function requirePlatformAdmin(): Promise<{ userId: string; email: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    return null;
  }

  return { userId: user.id, email: profile.email || user.email || '' };
}

/**
 * Map database row to Tenant type
 */
function mapRowToTenant(data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    domain: data.domain,
    plan: data.plan,
    status: data.status,
    settings: data.settings,
    database_url: data.database_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// =============================================================================
// GET /api/admin/tenants/:id
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid tenant ID format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: mapRowToTenant(data as Record<string, unknown>),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-api] GET /tenants/:id error:', message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/admin/tenants/:id
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid tenant ID format' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.plan !== undefined) {
      if (!['starter', 'professional', 'enterprise'].includes(body.plan)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid plan' },
          { status: 400 }
        );
      }
      updateData.plan = body.plan;
    }
    if (body.status !== undefined) {
      if (!['active', 'suspended', 'pending', 'cancelled'].includes(body.status)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // Track suspension
      if (body.status === 'suspended') {
        updateData.suspended_at = new Date().toISOString();
        updateData.suspended_reason = body.suspended_reason || 'Admin suspended';
      } else {
        updateData.suspended_at = null;
        updateData.suspended_reason = null;
      }
    }
    if (body.settings !== undefined) {
      updateData.settings = body.settings;
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[admin-api] Error updating tenant:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Failed to update tenant: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    console.log(`[admin-api] Tenant updated by ${admin.email}:`, id);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: mapRowToTenant(data as Record<string, unknown>),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-api] PATCH /tenants/:id error:', message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/admin/tenants/:id
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid tenant ID format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // First get the tenant to check if it's the default tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', id)
      .single();

    if (!tenant) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the default tenant
    if (tenant.slug === 'reinplaner') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot delete the default tenant' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[admin-api] Error deleting tenant:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Failed to delete tenant: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[admin-api] Tenant deleted by ${admin.email}:`, id);

    return NextResponse.json<ApiResponse>(
      { success: true },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-api] DELETE /tenants/:id error:', message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
