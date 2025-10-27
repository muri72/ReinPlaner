"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Home,
  Briefcase,
  Users,
  ContactRound,
  Building,
  UsersRound,
  Clock,
  CalendarOff,
  CalendarCheck,
  TrendingUp,
  FileText,
  Star,
  DollarSign,
  ListOrdered,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

interface NavItemBase {
  title: string;
  roles: UserRole[];
  badge?: string;
}

interface NavLinkItem extends NavItemBase {
  href: string;
  icon: React.ElementType;
  isCategory?: false;
}

interface NavCategoryItem extends NavItemBase {
  isCategory: true;
  children: NavLinkItem[];
}

type NavItem = NavLinkItem | NavCategoryItem;

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ['admin', 'manager'],
  },
  {
    title: "Kunden-Portal",
    href: "/portal/dashboard",
    icon: Home,
    roles: ['customer'],
  },
  {
    title: "Mitarbeiter-Portal",
    href: "/employee/dashboard",
    icon: Home,
    roles: ['employee'],
  },
  {
    title: "Auftragsmanagement",
    isCategory: true,
    roles: ['admin', 'manager', 'employee'],
    children: [
      { title: "Aufträge", href: "/dashboard/orders", icon: Briefcase, roles: ['admin', 'manager', 'employee'] },
      { title: "Objekte", href: "/dashboard/objects", icon: Building, roles: ['admin', 'manager', 'employee'] },
      { title: "Planung", href: "/dashboard/planning", icon: CalendarCheck, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: "Kundenbeziehungen",
    isCategory: true,
    roles: ['admin', 'manager', 'employee', 'customer'],
    children: [
      { title: "Kunden", href: "/dashboard/customers", icon: Users, roles: ['admin', 'manager', 'employee'] },
      { title: "Kontakte", href: "/dashboard/customer-contacts", icon: ContactRound, roles: ['admin', 'manager', 'employee'] },
      { title: "Feedback", href: "/dashboard/feedback", icon: Star, roles: ['admin', 'manager', 'employee', 'customer'] },
      { title: "Tickets", href: "/dashboard/tickets", icon: MessageSquare, roles: ['admin', 'manager', 'employee', 'customer'] },
    ],
  },
  {
    title: "Personal & Zeit",
    isCategory: true,
    roles: ['admin', 'manager', 'employee'],
    children: [
      { title: "Mitarbeiter", href: "/dashboard/employees", icon: UsersRound, roles: ['admin', 'manager', 'employee'] },
      { title: "Abwesenheiten", href: "/dashboard/absence-requests", icon: CalendarOff, roles: ['admin', 'manager', 'employee'] },
      { title: "Zeiterfassung", href: "/dashboard/time-tracking", icon: Clock, roles: ['admin', 'manager', 'employee'] },
    ],
  },
  {
    title: "Analyse & Berichte",
    isCategory: true,
    roles: ['admin', 'manager'],
    children: [
      { title: "Berichte", href: "/dashboard/reports", icon: FileText, roles: ['admin'] },
      { title: "Finanzen", href: "/dashboard/finances", icon: DollarSign, roles: ['admin', 'manager'] },
      { title: "Statistiken", href: "/dashboard/analytics", icon: TrendingUp, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: "Meine Buchungen",
    href: "/portal/dashboard/bookings",
    icon: Briefcase,
    roles: ['customer'],
  },
];

interface SidebarNavProps {
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
}

export function SidebarNav({ currentUserRole, onSignOut }: SidebarNavProps) {
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

  const isActive = (href: string) => {
    if (href === pathname) return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <SidebarMenu className="space-y-2">
      {filteredNavItems.map((item) => (
        item.isCategory ? (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-2">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.children.map((child) => (
                  <SidebarMenuItem key={child.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(child.href)}
                      tooltip={child.title}
                      className={cn(
                        "h-9 text-sm font-medium transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                        "data-[active=true]:shadow-sm"
                      )}
                    >
                      <Link href={child.href}>
                        <child.icon className="h-4 w-4" />
                        <span className="truncate">{child.title}</span>
                        {child.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {child.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href)}
              tooltip={item.title}
              className={cn(
                "h-9 text-sm font-medium transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                "data-[active=true]:shadow-sm"
              )}
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      ))}
      
      <Separator className="my-4" />
      
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Einstellungen"
                className={cn(
                  "h-9 text-sm font-medium transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                )}
              >
                <Link href="/dashboard/profile">
                  <Settings className="h-4 w-4" />
                  <span className="truncate">Einstellungen</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Hilfe"
                className={cn(
                  "h-9 text-sm font-medium transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="truncate">Hilfe</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarMenu>
  );
}