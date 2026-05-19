import { NextResponse } from 'next/server';

/**
 * API Route: /api/auth/redirect
 * 
 * Returns the appropriate dashboard URL based on user role.
 * Used after login to redirect to the correct dashboard.
 * Works with NextAuth session or Supabase (optional).
 */
export async function GET() {
  try {
    // Try Supabase first (optional dependency)
    let redirectUrl = '/dashboard';
    let role = 'admin';

    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          role = profile.role || 'admin';
          
          switch (role) {
            case 'admin': redirectUrl = '/dashboard'; break;
            case 'manager': redirectUrl = '/dashboard/planning'; break;
            case 'employee': redirectUrl = '/employee/dashboard'; break;
            case 'customer': redirectUrl = '/portal/dashboard'; break;
            default: redirectUrl = '/dashboard';
          }
        }
      }
    } catch {
      // Supabase not available or error - use defaults
    }

    return NextResponse.json({ redirectUrl, role });

  } catch (error) {
    console.error('Redirect API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', redirectUrl: '/dashboard' },
      { status: 500 }
    );
  }
}