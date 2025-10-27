"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

export function DashboardClientLayout({ 
  children, 
  currentUserRole, 
  onSignOut, 
  userProfile 
}: DashboardClientLayoutProps) {
  const pathname = usePathname();

  const getHomeLink = () => {
    if (currentUserRole === 'customer') {
      return '/portal/dashboard';
    } else if (currentUserRole === 'employee') {
      return '/employee/dashboard';
    }
    return '/dashboard';
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-r from-sidebar-background to-sidebar-accent/50">
          <div className="flex items-center justify-between p-4">
            <Link href={getHomeLink()} className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">A</span>
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">ARIS</span>
            </Link>
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent" />
          </div>
        </SidebarHeader>
        
        <SidebarContent className="px-2 py-4">
          <SidebarNav currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </SidebarContent>
        
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex flex-col space-y-3">
            <NotificationBell />
            <UserMenu 
              currentUserRole={currentUserRole} 
              onSignOut={onSignOut} 
              userProfile={userProfile} 
            />
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1 text-sidebar-foreground hover:bg-sidebar-accent" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-foreground">
                {(() => {
                  const lastSegment = pathname.split('/').pop();
                  if (!lastSegment) return 'Dashboard';
                  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
                })()}
              </h1>
            </div>
            <div className="flex items-center space-x-2 md:hidden">
              <NotificationBell />
              <UserMenu 
                currentUserRole={currentUserRole} 
                onSignOut={onSignOut} 
                userProfile={userProfile} 
              />
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}