'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/lib/permissions';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    permissions: [PERMISSIONS.ORDER_READ, PERMISSIONS.CUSTOMER_READ],
  },
  {
    title: 'Aufträge',
    href: '/dashboard/orders',
    icon: '📋',
    permission: PERMISSIONS.ORDER_READ,
    children: [
      {
        title: 'Alle Aufträge',
        href: '/dashboard/orders',
        permission: PERMISSIONS.ORDER_READ,
      },
      {
        title: 'Neuer Auftrag',
        href: '/dashboard/orders/new',
        permission: PERMISSIONS.ORDER_CREATE,
      },
      {
        title: 'Meine Aufträge',
        href: '/dashboard/orders/my',
        roles: ['employee', 'customer'],
      },
    ],
  },
  {
    title: 'Kunden',
    href: '/dashboard/customers',
    icon: '👥',
    permission: PERMISSIONS.CUSTOMER_READ,
    children: [
      {
        title: 'Alle Kunden',
        href: '/dashboard/customers',
        permission: PERMISSIONS.CUSTOMER_READ,
      },
      {
        title: 'Neuer Kunde',
        href: '/dashboard/customers/new',
        permission: PERMISSIONS.CUSTOMER_CREATE,
      },
    ],
  },
  {
    title: 'Mitarbeiter',
    href: '/dashboard/employees',
    icon: '👤',
    permission: PERMISSIONS.EMPLOYEE_READ,
    children: [
      {
        title: 'Alle Mitarbeiter',
        href: '/dashboard/employees',
        permission: PERMISSIONS.EMPLOYEE_READ,
      },
      {
        title: 'Neuer Mitarbeiter',
        href: '/dashboard/employees/new',
        permission: PERMISSIONS.EMPLOYEE_CREATE,
      },
    ],
  },
  {
    title: 'Objekte',
    href: '/dashboard/objects',
    icon: '🏢',
    permission: PERMISSIONS.OBJECT_READ,
    children: [
      {
        title: 'Alle Objekte',
        href: '/dashboard/objects',
        permission: PERMISSIONS.OBJECT_READ,
      },
      {
        title: 'Neues Objekt',
        href: '/dashboard/objects/new',
        permission: PERMISSIONS.OBJECT_CREATE,
      },
    ],
  },
  {
    title: 'Benutzerverwaltung',
    href: '/dashboard/users',
    icon: '🔐',
    permission: PERMISSIONS.USER_READ,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Systemeinstellungen',
    href: '/dashboard/settings',
    icon: '⚙️',
    permission: PERMISSIONS.SYSTEM_CONFIG,
    roles: ['admin'],
  },
  {
    title: 'Audit-Log',
    href: '/dashboard/audit',
    icon: '📝',
    permission: PERMISSIONS.AUDIT_READ,
    roles: ['admin'],
  },
];

function filterNavItems(items: NavItem[], userPermissions: { hasPermission: (p: string) => boolean; hasAnyPermission: (p: string[]) => boolean; userRole: string }): NavItem[] {
  return items.filter(item => {
    // Check role-based access
    if (item.role && userPermissions.userRole !== item.role) {
      return false;
    }
    
    if (item.roles && !item.roles.includes(userPermissions.userRole)) {
      return false;
    }
    
    // Check permission-based access
    if (item.permission && !userPermissions.hasPermission(item.permission)) {
      return false;
    }
    
    if (item.permissions && !userPermissions.hasAnyPermission(item.permissions)) {
      return false;
    }
    
    // Filter children recursively
    if (item.children) {
      item.children = filterNavItems(item.children, userPermissions);
      // Only show parent if it has visible children or its own href
      return item.children.length > 0 || item.href;
    }
    
    return true;
  });
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isCollapsed?: boolean;
  currentUserRole?: string;
  onSignOut?: () => Promise<void>;
  onLinkClick?: () => void;
}

export function SidebarNav({ className, isCollapsed = false, onLinkClick, ...props }: SidebarNavProps) {
  const pathname = usePathname();
  const permissions = usePermissions();
  
  const filteredItems = filterNavItems(navigationItems, permissions);

  return (
    <nav className={cn('space-y-2', className)} {...props}>
      {filteredItems.map((item) => (
        <div key={item.href}>
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
              pathname === item.href
                ? 'bg-accent text-accent-foreground'
                : 'transparent'
            )}
            onClick={onLinkClick}
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            {!isCollapsed && <span className="flex-1">{item.title}</span>}
            {item.badge && !isCollapsed && (
              <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
          
          {item.children && !isCollapsed && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                    pathname === child.href
                      ? 'bg-accent text-accent-foreground'
                      : 'transparent'
                  )}
                  onClick={onLinkClick}
                >
                  <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                  <span>{child.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}