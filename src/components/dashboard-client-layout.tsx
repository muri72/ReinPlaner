"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { useUserProfile } from "@/components/user-profile-provider";

import {
  getCategoriesForRole,
  getFlatNavForRole,
  getHomeHref,
  getNavLabel,
  type NavLink,
  type NavCategory,
  type UserRole,
} from "@/lib/nav-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-lg text-muted-foreground">Lädt...</div>
    </div>
  );
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

function NavLinkItem({
  item,
  isActive,
  isCollapsed,
  onClick,
}: {
  item: NavLink;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  const label = getNavLabel(item.key);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={isCollapsed ? label : undefined}
        onClick={onClick}
      >
        <Link href={item.href}>
          <item.Icon className="size-5 shrink-0" />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNavContent({
  currentUserRole,
  isCollapsed,
}: {
  currentUserRole: UserRole;
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const flatLinks = getFlatNavForRole(currentUserRole);
  const categories = getCategoriesForRole(currentUserRole);

  return (
    <>
      {flatLinks.map((item) => (
        <NavLinkItem
          key={item.key}
          item={item}
          isActive={pathname === item.href}
          isCollapsed={isCollapsed}
        />
      ))}

      {flatLinks.length > 0 && categories.length > 0 && (
        <SidebarMenuItem className="py-1">
          <div className="mx-2 h-px bg-sidebar-border" />
        </SidebarMenuItem>
      )}

      {categories.map((category) => (
        <SidebarGroup key={category.key}>
          {!isCollapsed && (
            <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {getNavLabel(category.key)}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {category.children.map((child) => (
                <NavLinkItem
                  key={child.key}
                  item={child}
                  isActive={pathname === child.href}
                  isCollapsed={isCollapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────

function DesktopSidebar({
  currentUserRole,
  onSignOut,
}: {
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
}) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const homeHref = getHomeHref(currentUserRole);

  return (
    <Sidebar
      collapsible="icon"
      className="fixed left-0 top-0 z-30 hidden h-screen w-[--sidebar-width] flex-col md:flex"
    >
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-3 py-3 border-b border-sidebar-border">
        <Link href={homeHref} className="min-w-0 flex-1">
          <span className="text-lg font-bold text-sidebar-foreground truncate block">
            ReinPlaner
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-7 w-7 shrink-0"
          aria-label={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isCollapsed ? "rotate-180" : ""
            )}
          />
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto flex-1">
        <SidebarMenu>
          <SidebarNavContent currentUserRole={currentUserRole} isCollapsed={isCollapsed} />
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <div className="flex flex-col gap-2">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader({
  currentUserRole,
  onMenuOpen,
}: {
  currentUserRole: UserRole;
  onMenuOpen: () => void;
}) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuOpen}
          aria-label="Menü öffnen"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <Link href={getHomeHref(currentUserRole)}>
          <span className="text-lg font-bold text-primary">ReinPlaner</span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={async () => {}} />
        </div>
      </div>
    </header>
  );
}

// ─── Mobile Nav Sheet ─────────────────────────────────────────────────────────

function MobileNavSheet({
  currentUserRole,
  onSignOut,
  open,
  onOpenChange,
}: {
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const flatLinks = getFlatNavForRole(currentUserRole);
  const categories = getCategoriesForRole(currentUserRole);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-72 bg-background text-foreground p-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-4 border-b border-border">
          <Link
            href={getHomeHref(currentUserRole)}
            onClick={() => onOpenChange(false)}
            className="text-lg font-bold text-foreground"
          >
            ReinPlaner
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Menü schließen"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {flatLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.Icon className="h-5 w-5 shrink-0" />
                {getNavLabel(item.key)}
              </Link>
            );
          })}

          {flatLinks.length > 0 && categories.length > 0 && (
            <div className="border-t border-border my-3" />
          )}

          {categories.map((category) => (
            <div key={category.key} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {getNavLabel(category.key)}
              </p>
              {category.children.map((child) => {
                const isActive = pathname === child.href;
                return (
                  <Link
                    key={child.key}
                    href={child.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <child.Icon className="h-5 w-5 shrink-0" />
                    {getNavLabel(child.key)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function DashboardClientLayout({
  children,
  onSignOut,
}: DashboardClientLayoutProps) {
  const { currentUserRole, loading } = useUserProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useIsMobile();

  // Wait for client mount to avoid SSR/hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SSR + first hydration: show loading to avoid flash of wrong layout
  if (!isMounted || loading) {
    return <LoadingScreen />;
  }

  // Mobile: header + sheet + full-width content
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader
          currentUserRole={currentUserRole}
          onMenuOpen={() => setIsMobileMenuOpen(true)}
        />
        <MobileNavSheet
          currentUserRole={currentUserRole}
          onSignOut={onSignOut}
          open={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
        />
        <main className="flex-1 min-h-screen">
          <div className="p-4 space-y-4">
            <ImpersonationBanner />
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Desktop: sidebar + sidebar-aware content
  return (
    <SidebarProvider defaultOpen={true}>
      <DesktopSidebar
        currentUserRole={currentUserRole}
        onSignOut={onSignOut}
      />
      <main className="flex-1 min-h-screen md:ml-[--sidebar-width] data-[state=collapsed]:md:ml-[--sidebar-width-icon]">
        <div className="p-4 md:pl-6 md:pr-6 md:pt-6 space-y-4">
          <ImpersonationBanner />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
