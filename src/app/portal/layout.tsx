import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions"; // Reuse existing signOut action
import { DashboardClientLayout } from "@/components/dashboard-client-layout"; // Reuse existing layout component

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, role') // Fetch avatar_url and role
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  // Ensure only customers can access this layout
  // Note: The actual role check will happen in the client component
  // For now, we'll redirect on the server side if not a customer
  const serverSideRole = userProfile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'customer';
  if (serverSideRole !== 'customer') {
    redirect("/dashboard"); // Redirect to main dashboard if not a customer
  }

  return (
    <DashboardClientLayout onSignOut={signOut}>
      {children}
    </DashboardClientLayout>
  );
}