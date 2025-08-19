"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { BottomNav } from "@/components/bottom-nav"; // Import BottomNav
import { Fab } from "@/components/fab"; // Import Fab
import {
  CustomerCreateDialog,
  EmployeeCreateDialog,
  ObjectCreateDialog,
  OrderCreateDialog,
  CustomerContactCreateGeneralDialog,
  AbsenceRequestCreateDialog,
  TimeEntryCreateDialog
} from '@/components/dialogs'; // Assuming a barrel file for dialogs
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

export function DashboardClientLayout({ children, currentUserRole, onSignOut, userProfile }: DashboardClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const pathname = usePathname();

  const getHomeLink = () => {
    if (currentUserRole === 'customer') return '/portal/dashboard';
    if (currentUserRole === 'employee') return '/employee/dashboard';
    return '/dashboard';
  };

  // FAB context logic
  const [isFabOpen, setIsFabOpen] = useState(false);
  const FabContent = () => {
    if (pathname.startsWith('/dashboard/orders')) return <OrderCreateDialog onOrderCreated={() => setIsFabOpen(false)} />;
    if (pathname.startsWith('/dashboard/customers')) return <CustomerCreateDialog onCustomerCreated={() => setIsFabOpen(false)} />;
    if (pathname.startsWith('/dashboard/objects')) return <ObjectCreateDialog onObjectCreated={() => setIsFabOpen(false)} />;
    if (pathname.startsWith('/dashboard/employees')) return <EmployeeCreateDialog onEmployeeCreated={() => setIsFabOpen(false)} />;
    if (pathname.startsWith('/dashboard/customer-contacts')) return <CustomerContactCreateGeneralDialog onContactCreated={() => setIsFabOpen(false)} />;
    // Add other entities here
    return <OrderCreateDialog onOrderCreated={() => setIsFabOpen(false)} />; // Default fallback
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar (fest) */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-150 ease-in-out z-40",
          isCollapsed ? "w-20" : "w-64",
          "glassmorphism-card"
        )}
      >
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
            {isCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Button>
        </div>
        <nav className="flex-grow space-y-2 pt-4 border-t border-sidebar-border">
          <SidebarNav
            isCollapsed={isCollapsed}
            currentUserRole={currentUserRole}
            onSignOut={onSignOut}
          />
        </nav>
        <div className={cn(
          "mt-auto flex flex-col items-center",
          isCollapsed ? "justify-center" : "justify-between",
          "pt-4 border-t border-sidebar-border space-y-4"
        )}>
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} userProfile={userProfile} />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-background/80 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-30">
        <Link href={getHomeLink()} passHref>
          <h2 className="text-xl font-bold text-primary tracking-tight cursor-pointer">ARIS</h2>
        </Link>
        <div className="flex items-center space-x-2">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} userProfile={userProfile} />
        </div>
      </header>

      {/* Hauptinhalt */}
      <main className={cn(
        "flex-grow p-4 md:p-8",
        "pt-20 pb-20 md:pt-8 md:pb-8", // Padding top/bottom for mobile headers/nav
        "transition-all duration-150 ease-in-out",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        {children}
      </main>

      {/* Mobile Navigation & FAB */}
      <div className="md:hidden">
        <Dialog open={isFabOpen} onOpenChange={setIsFabOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col glassmorphism-card">
            {FabContent()}
          </DialogContent>
        </Dialog>
        <Fab onClick={() => setIsFabOpen(true)} />
        <BottomNav />
      </div>
    </div>
  );
}