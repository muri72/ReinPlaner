import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { DashboardClientLayout } from "@/components/dashboard-client-layout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get profile - the profile id IS the auth user id
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  // If no profile found, create one with default role
  if (profileError && profileError.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'employee',
        tenant_id: null
      });
      
    if (insertError) {
      console.error("Error creating profile:", insertError);
    }
  } else if (profileError) {
    console.error("Error loading profile:", profileError);
  }

  // NOTE: RBAC route enforcement is handled by Supabase RLS policies
  // For route-based redirects, we would need middleware with proper auth cookie handling

  return (
    <DashboardClientLayout onSignOut={signOut}>
      {children}
    </DashboardClientLayout>
  );
}