"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/server"; // This import will now be handled by the server component that wraps this client component
import { redirect } from "next/navigation"; // This import will now be handled by the server component that wraps this client component
import { signOut } from "@/app/dashboard/actions"; // Import server action

import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { cn } from "@/lib/utils";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
}

function DashboardLayoutClient({ children, currentUserRole, onSignOut }: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header and Navigation */}
      <header className="md:hidden w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col bg-gradient-to-br from-sidebar-background to-sidebar-accent/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">ARIS</h2>
                <NotificationBell />
              </div>
              <nav className="flex-grow space-y-2">
                {/* Mobile nav links will use the same SidebarNav component, but always expanded */}
                <SidebarNav isCollapsed={false} currentUserRole={currentUserRole} onSignOut={onSignOut} />
              </nav>
            </SheetContent>
          </Sheet>
          <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight ml-4">ARIS</h2>
        </div>
        <NotificationBell />
      </header>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64",
          "bg-gradient-to-br from-sidebar-background to-sidebar-accent/20"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">ARIS</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(isCollapsed ? "mx-auto" : "ml-auto")} // Center button when collapsed
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        <SidebarNav isCollapsed={isCollapsed} currentUserRole={currentUserRole} onSignOut={onSignOut} />
      </aside>
      <main className="flex-grow p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

// Original Server Component RootLayout
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
    <DashboardLayoutClient
      currentUserRole={currentUserRole}
      onSignOut={signOut}
    >
      {children}
    </DashboardLayoutClient>
  );
}