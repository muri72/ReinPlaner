"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home, Briefcase, Users, ContactRound, Building, UsersRound, Clock, CalendarOff,
  CalendarCheck, TrendingUp, FileText, Star
} from "lucide-react"; // Removed Settings, User, LogOut
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
      { title: "Ressourcenplanung", href: "/dashboard/planning", icon: CalendarCheck, roles: ['admin', 'manager'] },
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
    roles: ['admin', 'manager', 'employee'], // Customers don't manage personnel
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
      { title: "Arbeitszeitnachweise", href: "/dashboard/reports", icon: FileText, roles: ['admin'] }, // Only admin for reports
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
  onSignOut: () => Promise<void>; // Pass signOut action
}

export function SidebarNav({ isCollapsed, currentUserRole, onSignOut }: SidebarNavProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(item => {
    if (item.isCategory) {
      // Filtern der Kinder basierend auf Rollen
      item.children = item.children.filter(child => child.roles.includes(currentUserRole));
      // Zeige Kategorie nur, wenn sie Kinder hat
      return item.children.length > 0;
    }
    // Zeige einzelnen Link nur, wenn Rolle übereinstimmt
    return item.roles.includes(currentUserRole);
  });

  return (
    <div className="flex-grow space-y-2">
      {filteredNavItems.map((item) => (
        item.isCategory ? (
          <div key={item.title} className="space-y-2">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold uppercase text-muted-foreground px-4 pt-4 pb-2">
                {item.title}
              </h3>
            )}
            {item.children.map(child => (
              <Link key={child.href} href={child.href} passHref>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={pathname === child.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full",
                          isCollapsed ? "justify-center" : "justify-start",
                          "text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                        )}
                      >
                        <child.icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
                        {!isCollapsed && child.title}
                      </Button>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{child.title}</TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </Link>
            ))}
          </div>
        ) : (
          // Hier ist item vom Typ NavLinkItem, daher sind href und icon garantiert vorhanden
          <Link key={item.href} href={item.href} passHref>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full",
                      isCollapsed ? "justify-center" : "justify-start",
                      "text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
                    {!isCollapsed && item.title}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </Link>
        )
      ))}
    </div>
  );
}