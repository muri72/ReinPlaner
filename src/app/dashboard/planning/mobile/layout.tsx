"use client";

import React from "react";
import { MobileNavigation } from "@/components/mobile-navigation";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

interface MobilePlanningLayoutProps {
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

export function MobilePlanningLayout({ 
  children, 
  currentUserRole, 
  onSignOut, 
  userProfile,
  notificationCount = 0 
}: MobilePlanningLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-primary">ARIS Planung</h1>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('de-DE', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
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

      {/* Main Content */}
      <main className="flex-grow pt-16 pb-20 overflow-y-auto">
        <div className="h-full">
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