'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const impersonationSchema = z.object({
  targetUserId: z.string(),
  targetRole: z.enum(['admin', 'manager', 'employee', 'customer']),
});

export async function startImpersonation(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('Unauthorized: No active session');
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can impersonate users');
    }

    const targetUserId = formData.get('targetUserId') as string;
    const targetRole = formData.get('targetRole') as string;

    const validatedData = impersonationSchema.parse({
      targetUserId,
      targetRole,
    });

    // Verify target user exists
    const supabaseAdmin = createAdminClient();
    const { data: targetUser } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, first_name, last_name')
      .eq('id', validatedData.targetUserId)
      .single();

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Verify target role matches user's actual role
    if (targetUser.role !== validatedData.targetRole) {
      throw new Error('Role mismatch: Target user role does not match specified role');
    }

    // Store impersonation data in session metadata
    const impersonationData = {
      originalUserId: session.user.id,
      originalRole: profile.role,
      targetUserId: targetUser.id,
      targetRole: targetUser.role,
      startedAt: new Date().toISOString(),
    };

    // Update session with impersonation data
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        user_metadata: {
          ...session.user.user_metadata,
          impersonationData,
        },
      },
    });

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    // Log impersonation start for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'IMPERSONATION_START',
        user_id: session.user.id,
        target_user_id: targetUser.id,
        details: {
          originalRole: profile.role,
          targetRole: targetUser.role,
          targetEmail: targetUser.email,
          startedAt: impersonationData.startedAt,
        },
        ip_address: '', // You'd get this from request headers
        user_agent: '', // You'd get this from request headers
      });

    // Redirect to target user's dashboard
    const redirectPath = getRoleBasedRedirectPath(targetUser.role);
    redirect(redirectPath);

  } catch (error) {
    console.error('Impersonation error:', error);
    throw new Error('Failed to start impersonation');
  }
}

export async function stopImpersonation() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('No active session');
    }

    const impersonationData = session.user.user_metadata?.impersonationData;
    
    if (!impersonationData) {
      throw new Error('No active impersonation session');
    }

    const supabaseAdmin = createAdminClient();

    // Log impersonation end for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'IMPERSONATION_END',
        user_id: impersonationData.originalUserId,
        target_user_id: impersonationData.targetUserId,
        details: {
          originalRole: impersonationData.originalRole,
          targetRole: impersonationData.targetRole,
          startedAt: impersonationData.startedAt,
          endedAt: new Date().toISOString(),
          duration: Date.now() - new Date(impersonationData.startedAt).getTime(),
        },
        ip_address: '', // You'd get this from request headers
        user_agent: '', // You'd get this from request headers
      });

    // Clear impersonation data from session
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        user_metadata: {
          ...session.user.user_metadata,
          impersonationData: null,
        },
      },
    });

    if (updateError) {
      throw new Error(`Failed to clear impersonation: ${updateError.message}`);
    }

    // Redirect back to admin dashboard
    redirect('/dashboard/admin');

  } catch (error) {
    console.error('Stop impersonation error:', error);
    throw new Error('Failed to stop impersonation');
  }
}

export async function getImpersonationData() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    return session.user.user_metadata?.impersonationData || null;
  } catch (error) {
    console.error('Get impersonation data error:', error);
    return null;
  }
}

function getRoleBasedRedirectPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'manager':
      return '/dashboard/manager';
    case 'employee':
      return '/dashboard/employee';
    case 'customer':
      return '/portal/dashboard';
    default:
      return '/dashboard';
  }
}

export async function getAvailableUsersForImpersonation(role?: string) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can impersonate');
    }

    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, role, first_name, last_name, created_at')
      .neq('id', session.user.id); // Exclude current admin

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    const { data: users } = await query.order('created_at', { ascending: false });

    return users || [];
  } catch (error) {
    console.error('Get users for impersonation error:', error);
    throw new Error('Failed to fetch users for impersonation');
  }
}