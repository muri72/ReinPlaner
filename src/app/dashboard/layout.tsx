import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions"; // Import server action
import { DashboardClientLayout } from "@/components/dashboard-client-layout"; // Import the new client component

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

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const currentUserRole = userProfile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';

  return (
    <DashboardClientLayout
      currentUserRole={currentUserRole}
      onSignOut={signOut}
    >
      {children}
    </DashboardClientLayout>
  );
}