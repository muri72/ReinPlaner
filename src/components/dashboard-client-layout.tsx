"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, X, Menu } from "lucide-react";
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

// ─── Expanded Nav Item ────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      )}
    >
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ─── Collapsed Nav Item with Floating Tooltip ──────────────────────────────────
// Tooltip appears DIRECTLY to the right of the icon (not sidebar center)

function CollapsedNavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <div className="relative group w-full">
      <Link
        href={href}
        title={label}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-colors relative z-10",
          isActive
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600" : "text-slate-500")} />
      </Link>
      {/* Floating tooltip — positioned directly right of the 40px icon */}
      <div
        className="absolute left-full top-1/2 -translate-y-1/2 ml-1 px-2 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg whitespace-nowrap z-[200] pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity"
        style={{ minWidth: "max-content" }}
      >
        {label}
        {/* Arrow pointing left to icon */}
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover"
          style={{ right: "-1px" }}
        />
      </div>
    </div>
  );
}

// ─── Custom Sidebar ────────────────────────────────────────────────────────────

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

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-200 ease-in-out bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700"
      style={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        overflow: "visible",
      }}
    >
      {/* ── Header ── */}
      <div
        className="relative flex items-center border-b border-sidebar-border shrink-0"
        style={{ height: 57, overflow: "visible" }}
      >
        {/* Logo — clickable to toggle */}
        <button
          onClick={onToggle}
          className="flex items-center min-w-0 flex-1 h-full px-3 cursor-pointer bg-transparent border-none focus:outline-none"
          aria-label={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
          style={{ overflow: "visible" }}
        >
          {isCollapsed ? (
            <span
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0"
            >
              R
            </span>
          ) : (
            <span
              className="text-lg font-bold truncate block"
              style={{ color: "hsl(var(--sidebar-foreground))" }}
            >
              ReinPlaner
            </span>
          )}
        </button>
      </div>

      {/* ── Toggle Button — OUTSIDE header, right side of sidebar, elegant + thin ── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-[22px] flex items-center justify-center border border-sidebar-border shadow-sm transition-all duration-200",
          isCollapsed
            ? "left-[52px] h-6 w-6 rounded-md bg-background hover:bg-muted"
            : "left-[236px] h-6 w-6 rounded-md bg-background hover:bg-muted"
        )}
        style={{
          color: "hsl(var(--sidebar-foreground))",
          zIndex: 50,
        }}
        aria-label={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
      >
        <ChevronLeft
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </Button>

      {/* ── Nav (scrollable, no clipping for tooltips in collapsed mode) ── */}
      <nav
        className="flex-1 py-3"
        style={{
          overflowY: "auto",
          overflowX: "visible",
        }}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1 px-2">
            {flatLinks.map((item) => (
              <CollapsedNavItem
                key={item.key}
                href={item.href}
                icon={item.Icon}
                label={getNavLabel(item.key)}
                isActive={pathname === item.href}
              />
            ))}

            {flatLinks.length > 0 && categories.length > 0 && (
              <div className="w-8 border-t border-sidebar-border my-2" />
            )}

            {categories.map((category) =>
              category.children.map((child) => (
                <CollapsedNavItem
                  key={child.key}
                  href={child.href}
                  icon={child.Icon}
                  label={getNavLabel(child.key)}
                  isActive={pathname === child.href}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {flatLinks.map((item) => (
              <NavItem
                key={item.key}
                href={item.href}
                icon={item.Icon}
                label={getNavLabel(item.key)}
                isActive={pathname === item.href}
              />
            ))}

            {flatLinks.length > 0 && categories.length > 0 && (
              <div className="my-3 border-t border-sidebar-border" />
            )}

            {categories.map((category) => (
              <div key={category.key} className="space-y-1">
                <p
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {getNavLabel(category.key)}
                </p>
                {category.children.map((child) => (
                  <NavItem
                    key={child.key}
                    href={child.href}
                    icon={child.Icon}
                    label={getNavLabel(child.key)}
                    isActive={pathname === child.href}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <div
        className="shrink-0 border-t border-sidebar-border py-3"
        style={{ overflow: "visible" }}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 px-2">
            <NotificationBell isCollapsed />
            <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} isCollapsed />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3">
            <NotificationBell isCollapsed={false} />
            <div className="flex-1 min-w-0">
              <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} isCollapsed={false} />
            </div>
          </div>
        )}
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
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} isCollapsed={false} />
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

        <div className="flex items-center gap-1">
          <NotificationBell isCollapsed />
          <UserMenu currentUserRole={currentUserRole} onSignOut={async () => {}} isCollapsed />
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label="Menü öffnen"
          >
            <Menu className="h-5 w-5" />
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

  // Desktop layout
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
