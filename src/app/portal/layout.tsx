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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  const currentUserRole = userProfile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'customer';

  // Ensure only customers can access this layout
  if (currentUserRole !== 'customer') {
    redirect("/dashboard"); // Redirect to main dashboard if not a customer
  }

  return (
    <DashboardClientLayout
      currentUserRole={currentUserRole}
      onSignOut={signOut}
    >
      {children}
    </DashboardClientLayout>
  );
}