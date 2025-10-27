"use client";

import React from "react";
import { format } from "date-fns";
import { MobileNavigation } from "./mobile-navigation";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
  notificationCount?: number;
}

export function MobileDashboardLayout({ 
  children, 
  currentUserRole, 
  onSignOut, 
  userProfile,
  notificationCount = 0 
}: MobileDashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-primary">ARIS</h1>
            <div className="text-sm text-muted-foreground">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <UserMenu 
              currentUserRole={currentUserRole} 
              onSignOut={onSignOut} 
              userProfile={userProfile} 
            />
          </div>
        </div>
      </header>

      {/* Main Content with bottom padding for navigation */}
      <main className="flex-grow pb-20 overflow-y-auto">
        <div className="p-4 space-y-4">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation 
        currentUserRole={currentUserRole}
        onSignOut={onSignOut}
        userProfile={userProfile}
        notificationCount={notificationCount}
      />
    </div>
  );
}