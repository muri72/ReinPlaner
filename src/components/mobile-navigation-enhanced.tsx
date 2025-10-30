"use client";

import React, { useState, useEffect } from "react";
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
  GripVertical,
  Settings,
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notification-bell";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const getNavItems = (role: UserRole): NavItem[] => {
  const baseItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: getHomeLink(role), icon: Home, roles: ['admin', 'manager', 'employee', 'customer'] },
  ];

  const roleSpecificItems: Record<UserRole, NavItem[]> = {
    admin: [
      { id: 'orders', label: 'Aufträge', href: '/dashboard/orders', icon: Briefcase, roles: ['admin', 'manager', 'employee'] },
      { id: 'objects', label: 'Objekte', href: '/dashboard/objects', icon: Building, roles: ['admin', 'manager', 'employee'] },
      { id: 'planning', label: 'Planung', href: '/dashboard/planning', icon: CalendarCheck, roles: ['admin', 'manager'] },
      { id: 'employees', label: 'Mitarbeiter', href: '/dashboard/employees', icon: Users, roles: ['admin', 'manager', 'employee'] },
      { id: 'finances', label: 'Finanzen', href: '/dashboard/finances', icon: DollarSign, roles: ['admin', 'manager'] },
      { id: 'reports', label: 'Berichte', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
    ],
    manager: [
      { id: 'orders', label: 'Aufträge', href: '/dashboard/orders', icon: Briefcase, roles: ['admin', 'manager', 'employee'] },
      { id: 'objects', label: 'Objekte', href: '/dashboard/objects', icon: Building, roles: ['admin', 'manager', 'employee'] },
      { id: 'planning', label: 'Planung', href: '/dashboard/planning', icon: CalendarCheck, roles: ['admin', 'manager'] },
      { id: 'employees', label: 'Mitarbeiter', href: '/dashboard/employees', icon: Users, roles: ['admin', 'manager', 'employee'] },
      { id: 'finances', label: 'Finanzen', href: '/dashboard/finances', icon: DollarSign, roles: ['admin', 'manager'] },
    ],
    employee: [
      { id: 'orders', label: 'Aufträge', href: '/dashboard/orders', icon: Briefcase, roles: ['admin', 'manager', 'employee'] },
      { id: 'time-tracking', label: 'Zeiterfassung', href: '/dashboard/time-tracking', icon: Clock, roles: ['admin', 'manager', 'employee'] },
      { id: 'planning', label: 'Planung', href: '/dashboard/planning', icon: CalendarCheck, roles: ['admin', 'manager', 'employee'] },
    ],
    customer: [
      { id: 'bookings', label: 'Meine Buchungen', href: '/portal/dashboard/bookings', icon: Briefcase, roles: ['customer'] },
      { id: 'feedback', label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare, roles: ['admin', 'manager', 'employee', 'customer'] },
      { id: 'tickets', label: 'Tickets', href: '/dashboard/tickets', icon: MessageSquare, roles: ['admin', 'manager', 'employee', 'customer'] },
    ],
  };

  const allItems = [...baseItems, ...(roleSpecificItems[role] || [])];
  return allItems.filter(item => item.roles.includes(role));
};

const getHomeLink = (role: UserRole) => {
  switch (role) {
    case 'customer': return '/portal/dashboard';
    case 'employee': return '/employee/dashboard';
    default: return '/dashboard';
  }
};

// SortableItem Component
interface SortableNavItemProps {
  item: NavItem;
  isActive: boolean;
  currentUserRole: UserRole;
  onNavigate?: () => void;
}

const SortableNavItem: React.FC<SortableNavItemProps> = ({ item, isActive, currentUserRole, onNavigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !item.roles.includes(currentUserRole) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors",
        isActive 
          ? "text-primary bg-primary/10" 
          : "text-muted-foreground hover:text-foreground"
      )}
      {...attributes}
      {...listeners}
    >
      <item.icon className="h-5 w-5 mb-1" />
      <span className="text-xs font-medium">{item.label}</span>
      {item.badge && item.badge > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-destructive text-white">
          {item.badge > 99 ? '99+' : item.badge}
        </Badge>
      )}
    </div>
  );
};

interface MobileNavigationEnhancedProps {
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

export function MobileNavigationEnhanced({ 
  currentUserRole, 
  onSignOut, 
  userProfile,
  notificationCount = 0 
}: MobileNavigationEnhancedProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [visibleItems, setVisibleItems] = useState<NavItem[]>([]);
  const [allItems, setAllItems] = useState<NavItem[]>([]);
  const pathname = usePathname();

  // Lade und filtere Menüeinträge basierend auf Rolle
  useEffect(() => {
    const items = getNavItems(currentUserRole);
    setAllItems(items);
    
    // Lade gespeicherte Reihenfolge aus localStorage oder verwende Standard
    const savedOrder = localStorage.getItem(`nav-order-${currentUserRole}`);
    if (savedOrder) {
      try {
        const savedOrderArray = JSON.parse(savedOrder);
        const orderedItems = savedOrderArray
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean);
        setVisibleItems(orderedItems.slice(0, 5)); // Zeige erste 5 Items
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Menü-Reihenfolge:', error);
        setVisibleItems(items.slice(0, 5));
      }
    } else {
      setVisibleItems(items.slice(0, 5)); // Zeige erste 5 Items
    }
  }, [currentUserRole]);

  // Drag & Drop Handler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = visibleItems.findIndex(item => item.id === active.id);
      const newIndex = visibleItems.findIndex(item => item.id === over?.id);
      
      const newVisibleItems = arrayMove(visibleItems, oldIndex, newIndex);
      setVisibleItems(newVisibleItems);
      
      // Speichere neue Reihenfolge
      const newAllItems = [...allItems];
      const visibleItemIds = newVisibleItems.map(item => item.id);
      const hiddenItems = newAllItems.filter(item => !visibleItemIds.includes(item.id));
      const reorderedItems = [...newVisibleItems, ...hiddenItems];
      
      setAllItems(reorderedItems);
      localStorage.setItem(`nav-order-${currentUserRole}`, JSON.stringify(visibleItemIds));
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleNavigate = () => {
    setIsMenuOpen(false);
  };

  const visibleNavItems = visibleItems.filter(item => item.roles.includes(currentUserRole));
  const hiddenNavItems = allItems.filter(item => 
    item.roles.includes(currentUserRole) && !visibleItems.some(visible => visible.id === item.id)
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      {/* Hauptnavigation */}
      <div className="flex justify-around items-center h-16 px-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-destructive text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
        
        {/* Bearbeiten-Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEditMode}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-lg"
        >
          <GripVertical className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">
            {isEditMode ? 'Fertig' : 'Mehr'}
          </span>
        </Button>
      </div>

      {/* Erweitertes Menü im Edit-Mode */}
      {isEditMode && (
        <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-border p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Menü anpassen</h3>
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              <X className="h-4 w-4 mr-2" />
              Schließen
            </Button>
          </div>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
            <div className="space-y-2">
              {/* Sichtbare Items - Sortierbar */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Sichtbar (ziehen zum sortieren)</h4>
                <SortableContext items={visibleItems.map(item => item.id)}>
                  <div className="grid grid-cols-5 gap-2">
                    {visibleNavItems.map((item) => (
                      <SortableNavItem
                        key={item.id}
                        item={item}
                        isActive={pathname === item.href}
                        currentUserRole={currentUserRole}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* Versteckte Items */}
              {hiddenNavItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Versteckt</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {hiddenNavItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-3 rounded-lg border border-dashed border-muted-foreground/30",
                          "opacity-60"
                        )}
                      >
                        <item.icon className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DndContext>
          
          <DragOverlay />
        </div>
      )}

      {/* Erweitertes Menü im Normal-Mode */}
      {!isEditMode && (
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
              <SheetTitle>Alle Menüpunkte</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 p-4">
              {allItems
                .filter(item => item.roles.includes(currentUserRole))
                .map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
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
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge className="mt-1 inline-flex">
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
            
            {/* Benutzer-Section */}
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
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}