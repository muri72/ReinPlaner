/**
 * Admin Tenant Management API Route
 * 
 * RESTful API for tenant management operations.
 * All endpoints require admin authentication.
 * 
 * GET    /api/admin/tenants          - List all tenants
 * GET    /api/admin/tenants/:id      - Get single tenant
 * POST   /api/admin/tenants          - Create new tenant
 * PATCH  /api/admin/tenants/:id      - Update tenant
 * DELETE /api/admin/tenants/:id      - Delete tenant
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { TenantPlan, TenantStatus, TenantSettings, CreateTenantInput } from '@/lib/tenant/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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
 * Parse pagination parameters from URL
 */
function getPaginationParams(request: NextRequest): { page: number; pageSize: number } {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  return { page, pageSize };
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
// GET /api/admin/tenants
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { page, pageSize } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') as TenantStatus | null;
    const plan = searchParams.get('plan') as TenantPlan | null;

    let query = supabase
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status && ['active', 'suspended', 'pending', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }

    if (plan && ['starter', 'professional', 'enterprise'].includes(plan)) {
      query = query.eq('plan', plan);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin-api] Error fetching tenants:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const total = count || 0;

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: (data || []).map(row => mapRowToTenant(row as Record<string, unknown>)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-api] GET /tenants error:', message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/tenants
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields: slug, name' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Validate plan if provided
    if (body.plan && !['starter', 'professional', 'enterprise'].includes(body.plan)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid plan. Must be: starter, professional, or enterprise' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const insertData = {
      slug: body.slug,
      name: body.name,
      domain: body.domain || null,
      plan: body.plan || 'starter',
      status: 'pending',
      settings: body.settings || {},
      created_by: admin.userId,
    };

    const { data, error } = await supabase
      .from('tenants')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[admin-api] Error creating tenant:', error);

      if (error.code === '23505') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'A tenant with this slug already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json<ApiResponse>(
        { success: false, error: `Failed to create tenant: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[admin-api] Tenant created by ${admin.email}:`, data.slug);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: mapRowToTenant(data as Record<string, unknown>),
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-api] POST /tenants error:', message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
