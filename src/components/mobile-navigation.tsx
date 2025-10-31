"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Briefcase, 
  Users, 
  Building, 
  CalendarCheck, 
  FileText, 
  DollarSign, 
  Clock, 
  MessageSquare,
  Menu,
  X,
  Bell,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notification-bell";

type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

interface MobileNavigationProps {
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
  notificationCount?: number;
}

const getHomeLink = (role: UserRole) => {
  switch (role) {
    case 'customer': return '/portal/dashboard';
    case 'employee': return '/employee/dashboard';
    default: return '/dashboard';
  }
};

const getNavItems = (role: UserRole) => {
  const baseItems = [
    { icon: Home, label: 'Dashboard', href: getHomeLink(role) },
  ];

  const roleSpecificItems = {
    admin: [
      { icon: Briefcase, label: 'Aufträge', href: '/dashboard/orders' },
      { icon: Building, label: 'Objekte', href: '/dashboard/objects' },
      { icon: CalendarCheck, label: 'Planung', href: '/dashboard/planning' },
      { icon: Users, label: 'Mitarbeiter', href: '/dashboard/employees' },
      { icon: DollarSign, label: 'Finanzen', href: '/dashboard/finances' },
      { icon: FileText, label: 'Berichte', href: '/dashboard/reports' },
    ],
    manager: [
      { icon: Briefcase, label: 'Aufträge', href: '/dashboard/orders' },
      { icon: Building, label: 'Objekte', href: '/dashboard/objects' },
      { icon: CalendarCheck, label: 'Planung', href: '/dashboard/planning' },
      { icon: Users, label: 'Mitarbeiter', href: '/dashboard/employees' },
      { icon: DollarSign, label: 'Finanzen', href: '/dashboard/finances' },
    ],
    employee: [
      { icon: Briefcase, label: 'Aufträge', href: '/dashboard/orders' },
      { icon: Clock, label: 'Zeiterfassung', href: '/dashboard/time-tracking' },
      { icon: CalendarCheck, label: 'Planung', href: '/dashboard/planning' },
    ],
    customer: [
      { icon: Briefcase, label: 'Meine Buchungen', href: '/portal/dashboard/bookings' },
      { icon: MessageSquare, label: 'Feedback', href: '/dashboard/feedback' },
      { icon: FileText, label: 'Tickets', href: '/dashboard/tickets' },
    ],
  };

  return [...baseItems, ...(roleSpecificItems[role] || [])];
};

export function MobileNavigation({ 
  currentUserRole, 
  onSignOut, 
  userProfile,
  notificationCount = 0 
}: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getNavItems(currentUserRole);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      {/* Bottom Navigation */}
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.href === '/dashboard/notifications' && notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-destructive text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Link>
          );
        })}
        
        {/* More Menu Button */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center justify-center py-2 px-3 rounded-lg"
            >
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Mehr</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Menü</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 p-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center p-4 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-6 w-6 mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            
            {/* User Section */}
            <div className="border-t mt-4 pt-4">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {userProfile?.first_name || 'Benutzer'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userProfile?.role || 'Rolle'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSignOut();
                    setIsMenuOpen(false);
                  }}
                >
                  Abmelden
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}