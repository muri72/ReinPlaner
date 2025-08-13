"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home, Briefcase, Users, ContactRound, Building, UsersRound, Clock, CalendarOff,
  CalendarCheck, TrendingUp, FileText, Star, Bell, User, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell"; // Import NotificationBell
import { UserMenu } from "./user-menu"; // Import UserMenu
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { createClient } from "@/lib/supabase/client"; // Import supabase client for user profile

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
  isSpecial?: 'notification' | 'user-menu'; // Custom flag to identify special items
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
      { title: "Planung", href: "/dashboard/planning", icon: CalendarCheck, roles: ['admin', 'manager'] }, // Umbenannt
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
      { title: "Berichte", href: "/dashboard/reports", icon: FileText, roles: ['admin'] }, // Umbenannt
    ],
  },
  {
    title: "Feedback",
    href: "/dashboard/feedback",
    icon: Star,
    roles: ['admin', 'manager', 'employee', 'customer'],
  },
  // Neue spezielle Navigationspunkte
  {
    title: "Benachrichtigungen",
    href: "/dashboard/notifications", // Kann auf eine Benachrichtigungsseite verlinken oder einfach nur den Popover öffnen
    icon: Bell,
    roles: ['admin', 'manager', 'employee', 'customer'],
    isSpecial: 'notification',
  },
  {
    title: "Profil",
    href: "/dashboard/profile",
    icon: User,
    roles: ['admin', 'manager', 'employee', 'customer'],
    isSpecial: 'user-menu',
  },
];

interface SidebarNavProps {
  isCollapsed: boolean;
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
  onLinkClick?: () => void; // Neue Prop
}

export function SidebarNav({ isCollapsed, currentUserRole, onSignOut, onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = React.useState<{ firstName: string | null; lastName: string | null; avatarUrl: string | null } | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile({
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.avatar_url,
          });
        }
      }
    };
    fetchProfile();
  }, [supabase]);

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

  const displayName = profile?.firstName || profile?.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : "Mein Profil";
  const avatarFallback = profile?.firstName?.[0] || profile?.lastName?.[0] || 'U';

  return (
    <TooltipProvider delayDuration={300}> {/* TooltipProvider hierher verschoben */}
      <div className="flex-grow space-y-2">
        {filteredNavItems.map((item) => {
          if (item.isCategory) {
            return (
              <div key={item.title} className="space-y-2">
                {!isCollapsed && (
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground px-4 pt-4 pb-2">
                    {item.title}
                  </h3>
                )}
                {item.children.map(child => (
                  <Tooltip key={child.href}> {/* Tooltip direkt */}
                    <TooltipTrigger asChild>
                      <Link href={child.href} passHref onClick={onLinkClick}>
                        <Button
                          variant={pathname === child.href ? "secondary" : "ghost"}
                          className={cn(
                            "w-full",
                            isCollapsed ? "justify-center" : "justify-start",
                            "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                          )}
                        >
                          <child.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                          {!isCollapsed && child.title}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{child.title}</TooltipContent>}
                  </Tooltip>
                ))}
              </div>
            );
          } else if (item.isSpecial === 'notification') {
            return (
              <NotificationBell key={item.href}>
                <Tooltip> {/* Tooltip direkt innerhalb von NotificationBell's children */}
                  <TooltipTrigger asChild>
                    <Link href={item.href} passHref onClick={onLinkClick}>
                      <Button
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full",
                          isCollapsed ? "justify-center" : "justify-start",
                          "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                        )}
                      >
                        <item.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                        {!isCollapsed && item.title}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              </NotificationBell>
            );
          } else if (item.isSpecial === 'user-menu') {
            return (
              <UserMenu key={item.href} currentUserRole={currentUserRole} onSignOut={onSignOut}>
                <Tooltip> {/* Tooltip direkt innerhalb von UserMenu's children */}
                  <TooltipTrigger asChild>
                    <Link href={item.href} passHref onClick={onLinkClick}>
                      <Button
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full",
                          isCollapsed ? "justify-center" : "justify-start",
                          "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                        )}
                      >
                        <Avatar className={cn("h-8 w-8", !isCollapsed && "mr-2")}>
                          <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                          <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                        {!isCollapsed && displayName}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{displayName}</TooltipContent>}
                </Tooltip>
              </UserMenu>
            );
          } else {
            return (
              <Tooltip key={item.href}> {/* Tooltip direkt */}
                <TooltipTrigger asChild>
                  <Link href={item.href} passHref onClick={onLinkClick}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full",
                        isCollapsed ? "justify-center" : "justify-start",
                        "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                      )}
                    >
                      <item.icon className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
                      {!isCollapsed && item.title}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
              </Tooltip>
            );
          }
        })}
        {/* Sign Out Button at the very bottom */}
        <Tooltip> {/* Tooltip direkt */}
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full mt-auto", // Push to bottom
                isCollapsed ? "justify-center" : "justify-start",
                "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
              )}
              onClick={onSignOut}
            >
              <LogOut className={cn(isCollapsed ? "h-8 w-8" : "h-6 w-6", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Abmelden"}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Abmelden</TooltipContent>}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}