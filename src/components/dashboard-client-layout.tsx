"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { MobileNavigation } from "@/components/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ImpersonationBanner } from "@/components/impersonation-banner";

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
  // Add userProfile prop
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

export function DashboardClientLayout({ children, currentUserRole, onSignOut, userProfile }: DashboardClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const getHomeLink = () => {
    if (currentUserRole === 'customer') {
      return '/portal/dashboard';
    } else if (currentUserRole === 'employee') {
      return '/employee/dashboard';
    }
    return '/dashboard';
  };

  // Mobile Layout with Bottom Navigation
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col pb-16">
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={getHomeLink()} passHref>
              <h1 className="text-xl font-bold text-primary">ARIS</h1>
            </Link>
            <div className="flex items-center gap-2">
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <ImpersonationBanner />
            {children}
          </div>
        </main>

        {/* Bottom Navigation */}
        <MobileNavigation
          currentUserRole={currentUserRole}
          onSignOut={onSignOut}
          userProfile={userProfile}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobiler Header und Navigation (fest) */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between z-50 glassmorphism-card">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-7 w-7" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className={cn(
              "w-64 text-sidebar-foreground border-r border-sidebar-border flex flex-col",
              "bg-sidebar/80 backdrop-blur-xl glassmorphism-card",
              "h-full",
              "overflow-x-hidden" // Added to prevent horizontal scrolling
            )}
          >
            <SheetHeader className="flex items-center justify-between p-4 mb-4">
              <SheetTitle>
                <VisuallyHidden>Mobiles Navigationsmenü</VisuallyHidden>
              </SheetTitle>
              <SheetDescription>
                <VisuallyHidden>Navigation und Benutzeroptionen für mobile Geräte.</VisuallyHidden>
              </SheetDescription>
              <Link href={getHomeLink()} passHref onClick={() => setIsSheetOpen(false)}>
                <h2 className="text-xl font-bold text-primary tracking-tight cursor-pointer">ARIS</h2>
              </Link>
              {/* Removed SheetClose button */}
            </SheetHeader>
            <nav className="flex-grow overflow-y-auto p-4">
              <SidebarNav
                isCollapsed={false}
                currentUserRole={currentUserRole}
                onSignOut={onSignOut}
                onLinkClick={() => setIsSheetOpen(false)}
              />
            </nav>
            {/* Benachrichtigungsglocke und Benutzermenü am unteren Rand der Sidebar */}
            <div className={cn(
              "mt-auto flex flex-col items-center",
              isCollapsed ? "justify-center" : "justify-between",
              "p-4 border-t border-sidebar-border space-y-4"
            )}>
              <NotificationBell />
              {/* Pass userProfile to UserMenu */}
              <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} userProfile={userProfile} />
            </div>
          </SheetContent>
        </Sheet>
        {/* ARIS Text im mobilen Haupt-Header, zentriert */}
        <Link href={getHomeLink()} passHref>
          <h2 className="text-xl font-bold text-primary tracking-tight absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 cursor-pointer">ARIS</h2>
        </Link>
        <div className="flex items-center space-x-2">
          <NotificationBell />
          {/* Pass userProfile to UserMenu */}
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} userProfile={userProfile} />
        </div>
      </header>

      {/* Desktop Sidebar (fest) */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-150 ease-in-out z-40", // Removed overflow-hidden
          isCollapsed ? "w-20" : "w-64",
          "bg-gradient-to-br from-sidebar-background to-sidebar-accent glassmorphism-card"
        )}
      >
        {/* ARIS Text und Toggle-Button, immer zentriert */}
        <div className="flex flex-col items-center justify-center mb-4">
          <Link href={getHomeLink()} passHref>
            <h2 className="text-xl font-bold text-primary tracking-tight cursor-pointer">ARIS</h2>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-4"
          >
            {isCollapsed ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </Button>
        </div>

        <nav className="flex-grow space-y-2 pt-4 border-t border-sidebar-border overflow-y-auto">
          <SidebarNav
            isCollapsed={isCollapsed}
            currentUserRole={currentUserRole}
            onSignOut={onSignOut}
          />
        </nav>

        {/* Benachrichtigungsglocke und Benutzermenü am unteren Rand der Sidebar */}
        <div className={cn(
          "mt-auto flex flex-col items-center",
          isCollapsed ? "justify-center" : "justify-between",
          "pt-4 border-t border-sidebar-border space-y-4"
        )}>
          <NotificationBell />
          {/* Pass userProfile to UserMenu */}
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} userProfile={userProfile} />
        </div>
      </aside>

      {/* Hauptinhalt */}
      <main className={cn(
        "flex-grow p-4 md:p-8",
        "pt-20 md:pt-8",
        "transition-all duration-150 ease-in-out",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="space-y-4">
          <ImpersonationBanner />
          {children}
        </div>
      </main>
    </div>
  );
}