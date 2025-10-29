"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function startImpersonation(targetUserId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const headersList = await headers();
  
  // Verify admin role
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin) throw new Error("Not authenticated");
  
  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', admin.id)
    .single();
    
  if (adminProfile?.role !== 'admin') {
    throw new Error("Only admins can impersonate");
  }
  
  // Get target user info
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', targetUserId)
    .single();
    
  if (!targetProfile) throw new Error("Target user not found");
  
  // Check for active impersonation
  const { data: activeSession } = await adminClient
    .from('impersonation_sessions')
    .select('id')
    .eq('admin_user_id', admin.id)
    .eq('is_active', true)
    .single();
    
  if (activeSession) {
    throw new Error("Already impersonating another user");
  }
  
  // Create impersonation session
  const { data: session, error } = await adminClient
    .from('impersonation_sessions')
    .insert({
      admin_user_id: admin.id,
      impersonated_user_id: targetUserId,
      impersonated_role: targetProfile.role,
      session_metadata: { 
        admin_email: admin.email,
        target_name: `${targetProfile.first_name} ${targetProfile.last_name}`
      },
      ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
      user_agent: headersList.get('user-agent')
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Store in cookie
  const cookieStore = await cookies();
  cookieStore.set('impersonation_session', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2 hours
    path: '/'
  });
  
  // Audit log
  await adminClient.from('audit_logs').insert({
    user_id: admin.id,
    impersonation_session_id: session.id,
    action: 'START_IMPERSONATION',
    new_data: { 
      target_user_id: targetUserId, 
      target_role: targetProfile.role,
      target_name: `${targetProfile.first_name} ${targetProfile.last_name}`
    },
    ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
    user_agent: headersList.get('user-agent')
  });
  
  return { success: true, session };
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('impersonation_session')?.value;
  
  if (!sessionId) return { success: false, message: "No active impersonation" };
  
  const adminClient = createAdminClient();
  const supabase = await createClient();
  const headersList = await headers();
  
  // End session
  const { error } = await adminClient
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString(), is_active: false })
    .eq('id', sessionId);
    
  if (error) throw error;
  
  // Audit log
  const { data: { user } } = await supabase.auth.getUser();
  
  await adminClient.from('audit_logs').insert({
    user_id: user?.id || 'unknown',
    impersonation_session_id: sessionId,
    action: 'STOP_IMPERSONATION',
    ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
    user_agent: headersList.get('user-agent')
  });
  
  // Clear cookie
  cookieStore.delete('impersonation_session');
  
  return { success: true };
}

export async function getActiveImpersonation() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('impersonation_session')?.value;
  
  if (!sessionId) return null;
  
  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from('impersonation_sessions')
    .select(`
      *,
      impersonated_profile:profiles!impersonated_user_id(first_name, last_name, role),
      admin_profile:profiles!admin_user_id(first_name, last_name)
    `)
    .eq('id', sessionId)
    .eq('is_active', true)
    .single();
    
  return session;
}

export async function getImpersonationHistory(limit: number = 50) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated");
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    throw new Error("Only admins can view impersonation history");
  }
  
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('impersonation_sessions')
    .select(`
      *,
      impersonated_profile:profiles!impersonated_user_id(first_name, last_name, role, email),
      admin_profile:profiles!admin_user_id(first_name, last_name, email)
    `)
    .order('started_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  
  return data;
}

export async function getUsersForImpersonation() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated");
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    throw new Error("Only admins can view users for impersonation");
  }
  
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, email')
    .neq('role', 'admin')
    .order('role, last_name, first_name');
    
  if (error) throw error;
  
  return data;
}