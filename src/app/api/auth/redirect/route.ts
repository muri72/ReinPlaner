import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API Route: /api/auth/redirect
 * 
 * Returns the appropriate dashboard URL based on user role.
 * Used after login to redirect to the correct dashboard.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Determine redirect URL based on role
    let redirectUrl = '/dashboard'
    
    switch (profile.role) {
      case 'admin':
        redirectUrl = '/dashboard'
        break
      case 'manager':
        redirectUrl = '/dashboard/planning'
        break
      case 'employee':
        redirectUrl = '/employee/dashboard'
        break
      case 'customer':
        redirectUrl = '/portal/dashboard'
        break
      default:
        redirectUrl = '/dashboard'
    }
    
    return NextResponse.json({
      redirectUrl,
      role: profile.role
    })
    
  } catch (error) {
    console.error('Redirect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
