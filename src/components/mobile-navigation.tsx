'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, GripVertical } from 'lucide-react';

interface MobileNavItem {
  id: string;
  title: string;
  href: string;
  icon?: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  badge?: string;
  children?: MobileNavItem[];
  position?: number;
  isVisible?: boolean;
}

const defaultMobileNavItems: MobileNavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    permissions: [PERMISSIONS.ORDER_READ, PERMISSIONS.CUSTOMER_READ],
    position: 1,
    isVisible: true,
  },
  {
    id: 'orders',
    title: 'Aufträge',
    href: '/dashboard/orders',
    icon: '📋',
    permission: PERMISSIONS.ORDER_READ,
    position: 2,
    isVisible: true,
    children: [
      {
        id: 'orders-all',
        title: 'Alle Aufträge',
        href: '/dashboard/orders',
        permission: PERMISSIONS.ORDER_READ,
        position: 1,
        isVisible: true,
      },
      {
        id: 'orders-new',
        title: 'Neuer Auftrag',
        href: '/dashboard/orders/new',
        permission: PERMISSIONS.ORDER_CREATE,
        position: 2,
        isVisible: true,
      },
      {
        id: 'orders-my',
        title: 'Meine Aufträge',
        href: '/dashboard/orders/my',
        roles: ['employee', 'customer'],
        position: 3,
        isVisible: true,
      },
    ],
  },
  {
    id: 'customers',
    title: 'Kunden',
    href: '/dashboard/customers',
    icon: '👥',
    permission: PERMISSIONS.CUSTOMER_READ,
    position: 3,
    isVisible: true,
  },
  {
    id: 'employees',
    title: 'Mitarbeiter',
    href: '/dashboard/employees',
    icon: '👤',
    permission: PERMISSIONS.EMPLOYEE_READ,
    position: 4,
    isVisible: true,
  },
  {
    id: 'objects',
    title: 'Objekte',
    href: '/dashboard/objects',
    icon: '🏢',
    permission: PERMISSIONS.OBJECT_READ,
    position: 5,
    isVisible: true,
  },
  {
    id: 'users',
    title: 'Benutzerverwaltung',
    href: '/dashboard/users',
    icon: '🔐',
    permission: PERMISSIONS.USER_READ,
    roles: ['admin', 'manager'],
    position: 6,
    isVisible: true,
  },
  {
    id: 'settings',
    title: 'Einstellungen',
    href: '/dashboard/settings',
    icon: '⚙️',
    permission: PERMISSIONS.SYSTEM_CONFIG,
    roles: ['admin'],
    position: 7,
    isVisible: true,
  },
];

function filterMobileNavItems(items: MobileNavItem[], userPermissions: { hasPermission: (p: string) => boolean; hasAnyPermission: (p: string[]) => boolean; userRole: string }): MobileNavItem[] {
  return items
    .filter(item => {
      // Check visibility
      if (item.isVisible === false) return false;
      
      // Check role-based access
      if (item.role && userPermissions.userRole !== item.role) return false;
      if (item.roles && !item.roles.includes(userPermissions.userRole)) return false;
      
      // Check permission-based access
      if (item.permission && !userPermissions.hasPermission(item.permission)) return false;
      if (item.permissions && !userPermissions.hasAnyPermission(item.permissions)) return false;
      
      return true;
    })
    .map(item => ({
      ...item,
      children: item.children ? filterMobileNavItems(item.children, userPermissions) : undefined,
    }))
    .sort((a, b) => (a.position || 0) - (b.position || 0));
}

interface MobileNavigationProps {
  className?: string;
  customItems?: MobileNavItem[];
  allowReordering?: boolean;
  currentUserRole?: string;
  onSignOut?: () => Promise<void>;
  userProfile?: any;
  notificationCount?: number;
}

export function MobileNavigation({ 
  className, 
  customItems, 
  allowReordering = false,
  currentUserRole,
  onSignOut,
  userProfile,
  notificationCount = 0
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [items, setItems] = useState<MobileNavItem[]>(customItems || defaultMobileNavItems);
  const pathname = usePathname();
  const permissions = usePermissions();
  
  const filteredItems = filterMobileNavItems(items, permissions);

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = items[dragIndex];
    const newItems = [...items];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    
    // Update positions
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    
    setItems(updatedItems);
  };

  const saveMenuConfiguration = async () => {
    try {
      // Save to localStorage or API
      localStorage.setItem('mobileNavConfig', JSON.stringify(items));
      setIsReordering(false);
    } catch (error) {
      console.error('Failed to save menu configuration:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menü öffnen</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          {allowReordering && permissions.isAdmin && (
            <div className="flex gap-2 mt-2">
              <Button
                variant={isReordering ? "default" : "outline"}
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
              >
                {isReordering ? 'Speichern' : 'Neu ordnen'}
              </Button>
              {isReordering && (
                <Button variant="outline" size="sm" onClick={() => setIsReordering(false)}>
                  Abbrechen
                </Button>
              )}
            </div>
          )}
        </SheetHeader>
        
        <div className="flex flex-col space-y-3 mt-6">
          {filteredItems.map((item, index) => (
            <div key={item.id} className="relative">
              {isReordering && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-move p-1"
                    onMouseDown={(e) => {
                      // Implement drag functionality
                      e.preventDefault();
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'transparent',
                  isReordering && 'pl-8'
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.icon && <span className="text-lg">{item.icon}</span>}
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
              
              {item.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                        pathname === child.href
                          ? 'bg-accent text-accent-foreground'
                          : 'transparent'
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                      <span>{child.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}