"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home, Briefcase, Users, ContactRound, Building, UsersRound, Clock, CalendarOff,
  CalendarCheck, TrendingUp, FileText, Star, DollarSign, ListOrdered, MessageSquare, Shield, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

// Definieren der Rollen-Typen
type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

// Basis-Interface für Navigationspunkte
interface NavItemBase {
  title: string;
  roles: UserRole[];
}

// Interface für einzelne Navigationslinks
interface NavLinkItem extends NavItemBase {
  href: string;
  icon: React.ElementType; // Verwenden von React.ElementType für JSX-Komponenten
  isCategory?: false; // Explizit als Nicht-Kategorie markieren
}

// Interface für Navigationskategorien
interface NavCategoryItem extends NavItemBase {
  isCategory: true;
  children: NavLinkItem[];
}

// Union-Typ für alle möglichen Navigationspunkte
type NavItem = NavLinkItem | NavCategoryItem;

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard", // Default dashboard for admin/manager
    icon: Home,
    roles: ['admin', 'manager'],
  },
  {
    title: "Kunden-Dashboard",
    href: "/portal/dashboard",
    icon: Home,
    roles: ['customer'],
  },
  {
    title: "Mitarbeiter-Dashboard",
    href: "/employee/dashboard",
    icon: Home,
    roles: ['employee'],
  },
  {
    title: "Management",
    isCategory: true,
    roles: ['admin', 'manager', 'employee'],
    children: [
      { title: "Aufträge", href: "/dashboard/orders", icon: Briefcase, roles: ['admin', 'manager', 'employee'] },
      { title: "Objekte", href: "/dashboard/objects", icon: Building, roles: ['admin', 'manager', 'employee'] },
      { title: "Planung", href: "/dashboard/planning", icon: CalendarCheck, roles: ['admin', 'manager'] },
      { title: "Berichte", href: "/dashboard/reports", icon: FileText, roles: ['admin'] },
      { title: "Finanzen", href: "/dashboard/finances", icon: DollarSign, roles: ['admin', 'manager'] }, // Moved here
    ],
  },
  {
    title: "Kunden",
    isCategory: true,
    roles: ['admin', 'manager', 'employee', 'customer'],
    children: [
      { title: "Kunden", href: "/dashboard/customers", icon: Users, roles: ['admin', 'manager', 'employee'] },
      { title: "Feedback", href: "/dashboard/feedback", icon: Star, roles: ['admin', 'manager', 'employee', 'customer'] },
      { title: "Tickets", href: "/dashboard/tickets", icon: MessageSquare, roles: ['admin', 'manager', 'employee', 'customer'] }, // New Tickets link
    ],
  },
  {
    title: "Personal",
    isCategory: true,
    roles: ['admin', 'manager', 'employee'],
    children: [
      { title: "Mitarbeiter", href: "/dashboard/employees", icon: UsersRound, roles: ['admin', 'manager', 'employee'] },
      { title: "Abwesenheiten", href: "/dashboard/absence-requests", icon: CalendarOff, roles: ['admin', 'manager', 'employee'] },
      { title: "Zeiterfassung", href: "/dashboard/time-tracking", icon: Clock, roles: ['admin', 'manager', 'employee'] },
    ],
  },
  {
    title: "Meine Buchungen",
    href: "/portal/dashboard/bookings",
    icon: Briefcase,
    roles: ['customer'],
  },
  {
    title: "Administration",
    isCategory: true,
    roles: ['admin'],
    children: [
      { title: "Einstellungen", href: "/dashboard/settings", icon: Settings, roles: ['admin'] },
      { title: "Audit-Logs", href: "/dashboard/audit-logs", icon: Shield, roles: ['admin'] },
      { title: "Benutzer", href: "/dashboard/users", icon: Users, roles: ['admin'] },
    ],
  },
];

interface SidebarNavProps {
  isCollapsed: boolean;
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
  onLinkClick?: () => void;
}

export function SidebarNav({ isCollapsed, currentUserRole, onSignOut, onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(item => {
    if (item.isCategory) {
      // Filter children based on roles (create new array to avoid mutation)
      const filteredChildren = item.children.filter(child =>
        child.roles.includes(currentUserRole)
      );
      // Show category only if it has children
      return filteredChildren.length > 0;
    }
    // Show single link only if role matches
    return item.roles.includes(currentUserRole);
  }).map(item => {
    // Create new objects with filtered children for categories
    if (item.isCategory) {
      return {
        ...item,
        children: item.children.filter(child =>
          child.roles.includes(currentUserRole)
        )
      };
    }
    return item;
  });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex-grow space-y-1">
        {filteredNavItems.map((item) => (
          item.isCategory ? (
            <div key={item.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="text-sm font-semibold uppercase text-muted-foreground px-4 pt-4 pb-2">
                  {item.title}
                </h3>
              )}
              {item.children.map(child => (
                <Tooltip key={child.href}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={pathname === child.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full",
                        isCollapsed ? "justify-center" : "justify-start",
                        "text-sm text-sidebar-foreground transition-colors duration-200",
                        // Active state: stronger highlight with primary accent
                        pathname === child.href ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      asChild
                    >
                      <Link href={child.href} passHref onClick={onLinkClick}>
                        <child.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                        {!isCollapsed && child.title}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{child.title}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          ) : (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full",
                    isCollapsed ? "justify-center" : "justify-start",
                    "text-sm text-sidebar-foreground transition-colors duration-200",
                    // Active state: stronger highlight with primary accent
                    pathname === item.href ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  asChild
                >
                  <Link href={item.href} passHref onClick={onLinkClick}>
                    <item.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                    {!isCollapsed && item.title}
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
            </Tooltip>
          )
        ))}
      </div>
    </TooltipProvider>
  );
}