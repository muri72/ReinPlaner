"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet"; // SheetTitle importieren
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // VisuallyHidden importieren

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

  const getHomeLink = () => {
    if (currentUserRole === 'customer') {
      return '/portal/dashboard';
    } else if (currentUserRole === 'employee') {
      return '/employee/dashboard';
    }
    return '/dashboard'; // Standard für Admin/Manager
  };

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
              "w-64 text-sidebar-foreground border-r border-sidebar-border flex flex-col relative",
              "bg-sidebar/80 backdrop-blur-xl glassmorphism-card",
              "h-full"
            )}
          >
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Menü schließen</span>
              </Button>
            </SheetClose>
            <SheetHeader className="flex items-center justify-between p-4 mb-4"> {/* mb-6 auf mb-4 reduziert */}
              <SheetTitle> {/* SheetTitle für Barrierefreiheit */}
                <VisuallyHidden> {/* Visuell verstecken, aber für Screenreader verfügbar machen */}
                  <Link href={getHomeLink()} passHref onClick={() => setIsSheetOpen(false)}>
                    <h2 className="text-xl font-bold text-primary tracking-tight cursor-pointer">ARIS Navigation</h2>
                  </Link>
                </VisuallyHidden>
              </SheetTitle>
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
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-150 ease-in-out z-40 overflow-hidden",
          isCollapsed ? "w-20" : "w-64",
          "bg-gradient-to-br from-sidebar-background to-sidebar-accent glassmorphism-card"
        )}
      >
        {/* ARIS Text und Toggle-Button, immer zentriert */}
        <div className="flex flex-col items-center justify-center mb-6">
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

        <nav className="flex-grow space-y-2 pt-4 border-t border-sidebar-border">
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
        {children}
      </main>
    </div>
  );
}