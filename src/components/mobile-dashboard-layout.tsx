"use client";

import React from "react";
import { format } from "date-fns";
import { MobileNavigation } from "./mobile-navigation";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { useUserProfile } from "@/components/user-profile-provider";
import { cn } from "@/lib/utils";

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
  notificationCount?: number;
}

export function MobileDashboardLayout({
  children,
  onSignOut,
  notificationCount = 0
}: MobileDashboardLayoutProps) {
  const { currentUserRole, userProfile, loading } = useUserProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header */}
      <header className="md:hidden glass-nav fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-primary">ReinPlaner</h1>
            <div className="text-sm text-muted-foreground">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <UserMenu
              currentUserRole={currentUserRole}
              onSignOut={onSignOut}
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
        notificationCount={notificationCount}
      />
    </div>
  );
}