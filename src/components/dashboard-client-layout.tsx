"use client";

import React, { useState } from "react";
import { Menu, ChevronLeft, ChevronRight, Bell } from "lucide-react"; // Bell hinzugefügt
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { createClient } from "@/lib/supabase/client"; // Import supabase client for user profile
import { User } from "lucide-react"; // Import User icon

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
}

export function DashboardClientLayout({ children, currentUserRole, onSignOut }: DashboardClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const supabase = createClient();
  const [profile, setProfile] = React.useState<{ firstName: string | null; lastName: string | null; avatarUrl: string | null } | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile({
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.avatar_url,
          });
        }
      }
    };
    fetchProfile();
  }, [supabase]);

  const displayName = profile?.firstName || profile?.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : "Mein Profil";
  const avatarFallback = profile?.firstName?.[0] || profile?.lastName?.[0] || 'U';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header and Navigation (fixed) */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between z-50">
        <div className="flex items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-7 w-7" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className={cn(
                "w-64 text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col",
                "bg-sidebar/80 backdrop-blur-xl"
              )}
              aria-labelledby="aris-navigation-title"
              aria-describedby="aris-navigation-description"
            >
              <SheetHeader>
                <SheetTitle id="aris-navigation-title">
                  <VisuallyHidden>ARIS Navigation</VisuallyHidden>
                </SheetTitle>
                <SheetDescription id="aris-navigation-description">
                  <VisuallyHidden>Hauptnavigation der ARIS Management Plattform.</VisuallyHidden>
                </SheetDescription>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-primary tracking-tight">ARIS</h2>
                  {/* Mobile Notification Bell (icon only) */}
                  <NotificationBell>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                    </Button>
                  </NotificationBell>
                </div>
              </SheetHeader>
              <nav className="flex-grow space-y-2">
                <SidebarNav
                  isCollapsed={false} // Mobile sidebar is never collapsed
                  currentUserRole={currentUserRole}
                  onSignOut={onSignOut}
                  onLinkClick={() => setIsSheetOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>
          <h2 className="text-xl font-bold text-primary tracking-tight ml-4">ARIS</h2>
        </div>
        <div className="flex items-center space-x-2">
          {/* Mobile Notification Bell (icon only) */}
          <NotificationBell>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          </NotificationBell>
          {/* Mobile User Menu (icon only) */}
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut}>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
            </Button>
          </UserMenu>
        </div>
      </header>

      {/* Desktop Sidebar (fixed) */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-300 ease-in-out z-40",
          isCollapsed ? "w-20" : "w-64",
          "bg-gradient-to-br from-sidebar-background to-sidebar-accent"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-primary tracking-tight">ARIS</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(isCollapsed ? "mx-auto" : "ml-auto")}
          >
            {isCollapsed ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </Button>
        </div>
        <SidebarNav isCollapsed={isCollapsed} currentUserRole={currentUserRole} onSignOut={onSignOut} />

        {/* Notification Bell and User Menu are now handled by SidebarNav */}
        {/* This section is now empty as they are part of SidebarNav */}
        <div className="hidden"></div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-grow p-4 md:p-8",
        "pt-20 md:pt-8",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}