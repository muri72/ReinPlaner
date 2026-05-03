"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { useUserProfile } from "@/components/user-profile-provider";

import {
  NAV_CONFIG,
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-lg text-muted-foreground">Lädt...</div>
    </div>
  );
}

// ─── Nav Link Button ─────────────────────────────────────────────────────────

function NavLinkButton({
  item,
  isCollapsed,
  onClick,
}: {
  item: NavLink;
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={isCollapsed ? getNavLabel(item.key) : undefined}
      className={cn(
        "w-full",
        isCollapsed ? "justify-center" : "justify-start"
      )}
    >
      <Link href={item.href} onClick={onClick}>
        <item.Icon className="size-5 shrink-0" />
        {!isCollapsed && (
          <span className="truncate">{getNavLabel(item.key)}</span>
        )}
      </Link>
    </SidebarMenuButton>
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

  const flatLinks = getFlatNavForRole(currentUserRole);
  const categories = getCategoriesForRole(currentUserRole);

  return (
    <Sidebar
      collapsible="icon"
      className="hidden md:flex"
    >
      <SidebarHeader className="flex flex-row items-center justify-between px-2 py-3 border-b border-sidebar-border">
        <Link href={homeHref} className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-bold text-sidebar-foreground truncate">
            ReinPlaner
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 shrink-0"
          aria-label={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto px-1">
        <SidebarMenu>
          {/* Flat links (home dashboard) */}
          {flatLinks.map((item) => (
            <SidebarMenuItem key={item.key}>
              <NavLinkButton item={item} isCollapsed={isCollapsed} />
            </SidebarMenuItem>
          ))}

          {flatLinks.length > 0 && categories.length > 0 && (
            <SidebarMenuItem>
              <SidebarSeparator className="my-2" />
            </SidebarMenuItem>
          )}

          {/* Categories */}
          {categories.map((category) => (
            <SidebarGroup key={category.key}>
              {!isCollapsed && (
                <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {getNavLabel(category.key)}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {category.children.map((child) => (
                    <SidebarMenuItem key={child.key}>
                      <NavLinkButton item={child} isCollapsed={isCollapsed} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <div className="flex flex-col gap-2">
          <NotificationBell />
          <UserMenu currentUserRole={currentUserRole} onSignOut={onSignOut} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// ─── Mobile Nav Sheet ────────────────────────────────────────────────────────

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

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col gap-4">
      {/* Flat links */}
      {flatLinks.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => onLinkClick?.()}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.Icon className="h-5 w-5 shrink-0" />
            {getNavLabel(item.key)}
          </Link>
        );
      })}

      {flatLinks.length > 0 && categories.length > 0 && (
        <div className="border-t border-sidebar-border" />
      )}

      {/* Categories */}
      {categories.map((category) => (
        <div key={category.key} className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            {getNavLabel(category.key)}
          </p>
          {category.children.map((child) => {
            const isActive = pathname === child.href;
            return (
              <Link
                key={child.key}
                href={child.href}
                onClick={() => onLinkClick?.()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <child.Icon className="h-5 w-5 shrink-0" />
                {getNavLabel(child.key)}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="border-t border-sidebar-border pt-4">
        <NotificationBell />
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-72 bg-sidebar text-sidebar-foreground p-0 flex flex-col"
      >
        <SheetHeader className="flex flex-row items-center justify-between p-4 border-b border-sidebar-border">
          <SheetTitle>
            <VisuallyHidden>Mobilnavigation</VisuallyHidden>
          </SheetTitle>
          <SheetDescription>
            <VisuallyHidden>Navigation für mobile Geräte</VisuallyHidden>
          </SheetDescription>
          <Link
            href={getHomeHref(currentUserRole)}
            onClick={() => onOpenChange(false)}
            className="text-lg font-bold text-sidebar-foreground"
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
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-4">
          <NavContent onLinkClick={() => onOpenChange(false)} />
        </nav>

        <div className="border-t border-sidebar-border p-4">
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

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function DashboardClientLayout({
  children,
  onSignOut,
}: DashboardClientLayoutProps) {
  const { userProfile, currentUserRole, loading } = useUserProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Mobile navigation sheet */}
      <MobileNavSheet
        currentUserRole={currentUserRole}
        onSignOut={onSignOut}
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      />

      {/* Mobile header (shown on small screens) */}
      <MobileHeader
        currentUserRole={currentUserRole}
        onMenuOpen={() => setIsMobileMenuOpen(true)}
      />

      {/* Desktop sidebar (shown on md+) */}
      <DesktopSidebar
        currentUserRole={currentUserRole}
        onSignOut={onSignOut}
      />

      {/* Main content area */}
      <main className="flex-1 min-h-screen">
        <div className="p-4 md:p-6 space-y-4">
          <ImpersonationBanner />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
