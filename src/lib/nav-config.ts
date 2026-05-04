"use client";

import {
  Home,
  Briefcase,
  Users,
  Building,
  UsersRound,
  Clock,
  CalendarOff,
  CalendarCheck,
  TrendingUp,
  FileText,
  Star,
  DollarSign,
  MessageSquare,
  Shield,
  Settings,
  Wrench,
  Activity,
  FileEdit,
  Building2,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "employee" | "customer";

export interface NavLink {
  /** Unique key — also used as translation key / label */
  key: string;
  /** Full path (used for href + active detection) */
  href: string;
  Icon: LucideIcon;
  /** Roles that can see this item */
  roles: UserRole[];
}

export interface NavCategory {
  key: string;
  /** Roles that can see this category (empty = always visible) */
  roles: UserRole[];
  children: NavLink[];
}

// ─── Single Links ────────────────────────────────────────────────────────────

const homeLinks: Record<UserRole, NavLink> = {
  admin: { key: "dashboard", href: "/dashboard", Icon: Home, roles: ["admin"] },
  manager: { key: "planning", href: "/dashboard/planning", Icon: Home, roles: ["manager"] },
  employee: { key: "employee-dashboard", href: "/employee/dashboard", Icon: Home, roles: ["employee"] },
  customer: { key: "portal-dashboard", href: "/portal/dashboard", Icon: Home, roles: ["customer"] },
};

// ─── Category Definitions ─────────────────────────────────────────────────────

const MANAGEMENT_LINKS: NavLink[] = [
  { key: "orders", href: "/dashboard/orders", Icon: Briefcase, roles: ["admin", "manager", "employee"] },
  { key: "objects", href: "/dashboard/objects", Icon: Building, roles: ["admin", "manager", "employee"] },
  { key: "planning", href: "/dashboard/planning", Icon: CalendarCheck, roles: ["admin", "manager"] },
  { key: "reports", href: "/dashboard/reports", Icon: TrendingUp, roles: ["admin"] },
  { key: "finances", href: "/dashboard/finances", Icon: DollarSign, roles: ["admin", "manager"] },
  { key: "invoices", href: "/dashboard/invoices", Icon: FileText, roles: ["admin", "manager"] },
];

const CUSTOMER_LINKS: NavLink[] = [
  { key: "customers", href: "/dashboard/customers", Icon: Users, roles: ["admin", "manager", "employee"] },
  { key: "feedback", href: "/dashboard/feedback", Icon: Star, roles: ["admin", "manager", "employee", "customer"] },
  { key: "tickets", href: "/dashboard/tickets", Icon: MessageSquare, roles: ["admin", "manager", "employee", "customer"] },
];

const STAFF_LINKS: NavLink[] = [
  { key: "employees", href: "/dashboard/employees", Icon: UsersRound, roles: ["admin", "manager", "employee"] },
  { key: "absence-requests", href: "/dashboard/absence-requests", Icon: CalendarOff, roles: ["admin", "manager", "employee"] },
  { key: "time-tracking", href: "/dashboard/time-tracking", Icon: Clock, roles: ["admin", "manager", "employee"] },
];

const PORTAL_LINKS: NavLink[] = [
  { key: "my-bookings", href: "/portal/dashboard/bookings", Icon: Briefcase, roles: ["customer"] },
];

const ADMIN_LINKS: NavLink[] = [
  { key: "platform-health", href: "/dashboard/platform-health", Icon: Activity, roles: ["admin"] },
  { key: "services", href: "/dashboard/services", Icon: Wrench, roles: ["admin"] },
  { key: "settings", href: "/dashboard/settings", Icon: Settings, roles: ["admin"] },
  { key: "templates", href: "/dashboard/templates", Icon: FileEdit, roles: ["admin"] },
  { key: "audit-logs", href: "/dashboard/audit-logs", Icon: Shield, roles: ["admin"] },
  { key: "users", href: "/dashboard/users", Icon: Users, roles: ["admin"] },
  { key: "tenants", href: "/dashboard/admin/tenants", Icon: Building2, roles: ["admin"] },
];

// ─── Full Navigation Tree ─────────────────────────────────────────────────────

export const NAV_CONFIG: (NavLink | NavCategory)[] = [
  homeLinks.admin,
  homeLinks.manager,
  homeLinks.employee,
  homeLinks.customer,
  {
    key: "management",
    roles: ["admin", "manager", "employee"],
    children: MANAGEMENT_LINKS,
  },
  {
    key: "customers-section",
    roles: ["admin", "manager", "employee", "customer"],
    children: CUSTOMER_LINKS,
  },
  {
    key: "staff",
    roles: ["admin", "manager", "employee"],
    children: STAFF_LINKS,
  },
  ...(ADMIN_LINKS.map((l) => ({ ...l, roles: ["admin"] })) as NavLink[]),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a flat list of all NavLinks visible for a given role */
export function getFlatNavForRole(role: UserRole): NavLink[] {
  return NAV_CONFIG.filter((item): item is NavLink => !("children" in item) && item.roles.includes(role));
}

/** Returns only categories (with filtered children) visible for a given role */
export function getCategoriesForRole(role: UserRole): NavCategory[] {
  return NAV_CONFIG
    .filter((item): item is NavCategory => "children" in item && item.children.some((c) => c.roles.includes(role)))
    .map((cat) => ({
      ...cat,
      children: cat.children.filter((c) => c.roles.includes(role)),
    }));
}

/** Returns ALL visible items (links + categories with children) for a role, flattened */
export function getAllNavItemsForRole(role: UserRole): NavLink[] {
  const links = getFlatNavForRole(role);
  const categories = getCategoriesForRole(role);
  return [...links, ...categories.flatMap((c) => c.children)];
}

/** Returns the home link href for a role */
export function getHomeHref(role: UserRole): string {
  const homeLink = homeLinks[role];
  return homeLink.href;
}

/** i18n labels (German) — extend as needed */
export const NAV_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "planning": "Planung",
  "employee-dashboard": "Dashboard",
  "portal-dashboard": "Dashboard",
  "orders": "Aufträge",
  "objects": "Objekte",
  "reports": "Berichte",
  "finances": "Finanzen",
  "invoices": "Rechnungen",
  "management": "Management",
  "customers-section": "Kunden",
  "customers": "Kunden",
  "feedback": "Feedback",
  "tickets": "Tickets",
  "staff": "Personal",
  "employees": "Mitarbeiter",
  "absence-requests": "Abwesenheiten",
  "time-tracking": "Zeiterfassung",
  "my-bookings": "Meine Buchungen",
  "platform-health": "Platform Health",
  "services": "Services",
  "settings": "Einstellungen",
  "templates": "Vorlagen",
  "audit-logs": "Audit-Logs",
  "users": "Benutzer",
  "tenants": "Mandanten",
};

export function getNavLabel(key: string): string {
  return NAV_LABELS[key] ?? key;
}
