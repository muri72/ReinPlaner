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
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header and Navigation (fixed) */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between z-50 glassmorphism-card">
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
                "bg-sidebar/80 backdrop-blur-xl glassmorphism-card" // Apply glassmorphism here
              )}
            >
              <SheetHeader>
                <SheetTitle>
                  ARIS Navigation
                </SheetTitle>
                <SheetDescription>
                  Hauptnavigation der ARIS Management Plattform.
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
                  searchQuery={searchQuery} // Pass search query
                  onSearchChange={setSearchQuery} // Pass search handler
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
          "bg-gradient-to-br from-sidebar-background to-sidebar-accent glassmorphism-card" // Apply glassmorphism here
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
        <SidebarNav
          isCollapsed={isCollapsed}
          currentUserRole={currentUserRole}
          onSignOut={onSignOut}
          searchQuery={searchQuery} // Pass search query
          onSearchChange={setSearchQuery} // Pass search handler
        />

        {/* Notification Bell and User Menu at the bottom of the sidebar */}
        <div className={cn(
          "mt-auto flex flex-col items-center",
          isCollapsed ? "justify-center" : "justify-between",
          "pt-4 border-t border-sidebar-border space-y-4" // Added space-y-4 for vertical spacing
        )}>
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
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