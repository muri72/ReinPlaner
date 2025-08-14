"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Home, Briefcase, Users, ContactRound, Building, UsersRound, Clock, CalendarOff,
  CalendarCheck, TrendingUp, FileText, Star
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
    href: "/dashboard",
    icon: Home,
    roles: ['admin', 'manager', 'employee', 'customer'],
  },
  {
    title: "Auftragsmanagement",
    isCategory: true,
    roles: ['admin', 'manager', 'employee', 'customer'],
    children: [
      { title: "Aufträge", href: "/dashboard/orders", icon: Briefcase, roles: ['admin', 'manager', 'employee', 'customer'] },
      { title: "Objekte", href: "/dashboard/objects", icon: Building, roles: ['admin', 'manager', 'employee', 'customer'] },
      { title: "Planung", href: "/dashboard/planning", icon: CalendarCheck, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: "Kunden & Kontakte",
    isCategory: true,
    roles: ['admin', 'manager', 'employee', 'customer'],
    children: [
      { title: "Kunden", href: "/dashboard/customers", icon: Users, roles: ['admin', 'manager', 'employee', 'customer'] },
      { title: "Kundenkontakte", href: "/dashboard/customer-contacts", icon: ContactRound, roles: ['admin', 'manager', 'employee', 'customer'] },
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
    title: "Finanzen & Berichte",
    isCategory: true,
    roles: ['admin', 'manager'],
    children: [
      { title: "Finanzen", href: "/dashboard/finances", icon: TrendingUp, roles: ['admin', 'manager'] },
      { title: "Berichte", href: "/dashboard/reports", icon: FileText, roles: ['admin'] },
    ],
  },
  {
    title: "Feedback",
    href: "/dashboard/feedback",
    icon: Star,
    roles: ['admin', 'manager', 'employee', 'customer'],
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
      item.children = item.children.filter(child =>
        child.roles.includes(currentUserRole)
      );
      return item.children.length > 0;
    }
    return item.roles.includes(currentUserRole);
  });

  return (
    <div className="flex-grow space-y-2">
      {filteredNavItems.map((item) => (
        item.isCategory ? (
          <div key={item.title} className="space-y-2">
            {!isCollapsed && (
              <h3 className="text-sm font-semibold uppercase text-muted-foreground px-4 pt-4 pb-2">
                {item.title}
              </h3>
            )}
            {item.children.map(child => (
              <Link key={child.href} href={child.href} passHref onClick={onLinkClick}>
                <Button
                  variant={pathname === child.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full relative", // Added relative for positioning the hover text
                    isCollapsed ? "justify-center" : "justify-start",
                    "text-sm text-sidebar-foreground transition-colors duration-200",
                    pathname === child.href ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <child.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                  {!isCollapsed && child.title}
                  {isCollapsed && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-sm whitespace-nowrap shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[99999]">
                      {child.title}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        ) : (
          <Link key={item.href} href={item.href} passHref onClick={onLinkClick}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full relative group", // Added relative and group for positioning the hover text
                isCollapsed ? "justify-center" : "justify-start",
                "text-sm text-sidebar-foreground transition-colors duration-200",
                pathname === item.href ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
              {!isCollapsed && item.title}
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-sm whitespace-nowrap shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[99999]">
                  {item.title}
                </span>
              )}
            </Button>
          </Link>
        )
      ))}
    </div>
  );
}