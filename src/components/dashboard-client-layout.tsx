"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Bell, User, Settings, LayoutDashboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { useUserProfile } from "@/components/user-profile-provider";

import {
  getCategoriesForRole,
  getFlatNavForRole,
  getHomeHref,
  getNavLabel,
  type UserRole,
} from "@/lib/nav-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_EXPANDED_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const STORAGE_KEY = "reinplaner-sidebar-collapsed";

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-lg text-muted-foreground">Lädt...</div>
    </div>
  );
}

// ─── Sidebar Navigation Item ─────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors relative group",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </Link>
  );
}

// ─── Custom Sidebar (plain, no shadcn dependency) ────────────────────────────

function CustomSidebar({
  currentUserRole,
  isCollapsed,
  onToggle,
  onSignOut,
}: {
  currentUserRole: UserRole;
  isCollapsed: boolean;
  onToggle: () => void;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const flatLinks = getFlatNavForRole(currentUserRole);
  const categories = getCategoriesForRole(currentUserRole);
  const homeHref = getHomeHref(currentUserRole);

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-200 ease-in-out"
      style={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        backgroundColor: "hsl(var(--sidebar-background))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-sidebar-border"
        style={{ height: 57 }}
      >
        <Link href={homeHref} className="min-w-0 flex-1">
          <span
            className="text-lg font-bold truncate block"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
          >
            ReinPlaner
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 shrink-0"
          style={{ color: "hsl(var(--sidebar-foreground))" }}
          aria-label={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isCollapsed ? "rotate-180" : ""
            )}
          />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Flat links */}
        {flatLinks.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            icon={item.Icon}
            label={getNavLabel(item.key)}
            isActive={pathname === item.href}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Divider */}
        {flatLinks.length > 0 && categories.length > 0 && (
          <div className="my-3 border-t border-sidebar-border" />
        )}

        {/* Category groups */}
        {categories.map((category) => (
          <div key={category.key} className="space-y-1">
            {!isCollapsed && (
              <p
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.5)" }}
              >
                {getNavLabel(category.key)}
              </p>
            )}
            {category.children.map((child) => (
              <NavItem
                key={child.key}
                href={child.href}
                icon={child.Icon}
                label={getNavLabel(child.key)}
                isActive={pathname === child.href}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <NotificationBell />
        <div className="mt-2">
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
      </div>
    </aside>
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

// ─── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader({
  currentUserRole,
  onMenuOpen,
}: {
  currentUserRole: UserRole;
  onMenuOpen: () => void;
}) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href={getHomeHref(currentUserRole)}>
          <span className="text-lg font-bold text-primary">ReinPlaner</span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={async () => {}} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label="Menü öffnen"
          >
            <span className="grid grid-cols-3 gap-0.5 h-4 w-4">
              {[...Array(9)].map((_, i) => (
                <span key={i} className="bg-current rounded-sm" />
              ))}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────

export function DashboardClientLayout({
  children,
  onSignOut,
}: DashboardClientLayoutProps) {
  const { currentUserRole, loading } = useUserProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Restore sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsMounted(true);
  }, []);

  // Persist sidebar collapse state
  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // SSR + first hydration: show loading
  if (!isMounted || loading) {
    return <LoadingScreen />;
  }

  // Mobile layout
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

  // Desktop layout: custom sidebar + content
  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <div className="min-h-screen bg-background">
      <CustomSidebar
        currentUserRole={currentUserRole}
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        onSignOut={onSignOut}
      />
      <main
        className="min-h-screen transition-all duration-200 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 space-y-4">
          <ImpersonationBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
