import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions"; // Reuse existing signOut action
import { DashboardClientLayout } from "@/components/dashboard-client-layout"; // Reuse existing layout component

export default async function EmployeeLayout({
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

  const currentUserRole = userProfile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';

  // Ensure only employees can access this layout
  if (currentUserRole !== 'employee') {
    redirect("/dashboard"); // Redirect to main dashboard if not an employee
  }

  return (
    <DashboardClientLayout
      currentUserRole={currentUserRole}
      onSignOut={signOut}
      userProfile={userProfile} // Pass the fetched userProfile
    >
      {children}
    </DashboardClientLayout>
  );
}