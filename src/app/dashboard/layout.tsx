import React from "react";
import { auth } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { DashboardClientLayout } from "@/components/dashboard-client-layout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardClientLayout onSignOut={signOut}>
      {children}
    </DashboardClientLayout>
  );
}