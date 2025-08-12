"use client";

import React, { useState } from "react";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
}

export function DashboardClientLayout({ children, currentUserRole, onSignOut }: DashboardClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Define desktop header height for padding calculation
  const desktopHeaderHeight = '64px'; // Corresponds to h-16

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header and Navigation (fixed) */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between z-50">
        <div className="flex items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
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
                  <NotificationBell />
                </div>
              </SheetHeader>
              <nav className="flex-grow space-y-2">
                <SidebarNav
                  isCollapsed={false}
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
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
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
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        <SidebarNav isCollapsed={isCollapsed} currentUserRole={currentUserRole} onSignOut={onSignOut} />
      </aside>

      {/* Desktop Header (newly fixed) */}
      <header
        className={cn(
          "hidden md:flex fixed top-0 right-0 h-16 bg-background text-foreground border-b border-border p-4 items-center justify-end z-50", // Changed z-45 to z-50
          isCollapsed ? "left-20 w-[calc(100%-80px)]" : "left-64 w-[calc(100%-256px)]",
          "bg-background/80 backdrop-blur-xl"
        )}
      >
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-grow p-4 md:p-8",
        "pt-20 md:pt-[calc(64px+32px)]", // Mobile pt-20 (for mobile header), Desktop pt-64px (for new fixed header) + 32px (for md:p-8)
        isCollapsed ? "md:ml-20" : "md:ml-64" // Adjust margin-left for fixed sidebar on desktop
      )}>
        {children}
      </main>
    </div>
  );
}