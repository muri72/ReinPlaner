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
  BarChart3,
  Eye,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "employee" | "customer" | "platform_admin" | "support";

export interface NavLink {
  key: string;
  href: string;
  Icon: LucideIcon;
  roles: UserRole[];
}

export interface NavCategory {
  key: string;
  roles: UserRole[];
  children: NavLink[];
}

// ─── Single Links ────────────────────────────────────────────────────────────

const homeLinks: Record<UserRole, NavLink> = {
  admin: { key: "dashboard", href: "/dashboard", Icon: Home, roles: ["admin"] },
  manager: { key: "planning", href: "/dashboard/planning", Icon: Home, roles: ["manager"] },
  employee: { key: "employee-dashboard", href: "/employee/dashboard", Icon: Home, roles: ["employee"] },
  customer: { key: "portal-dashboard", href: "/portal/dashboard", Icon: Home, roles: ["customer"] },
  // platform_admin home → overview page
  platform_admin: { key: "platform-overview", href: "/dashboard/admin", Icon: Home, roles: ["platform_admin"] },
  // support home → tenants list
  support: { key: "support-overview", href: "/dashboard/admin/tenants", Icon: Home, roles: ["support"] },
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

// ─── Platform Admin Categories ────────────────────────────────────────────────

const PLATFORM_ADMIN_TENANTS_LINKS: NavLink[] = [
  { key: "platform-tenants", href: "/dashboard/admin/tenants", Icon: Building2, roles: ["platform_admin"] },
];

const PLATFORM_ADMIN_REVENUE_LINKS: NavLink[] = [
  { key: "platform-revenue", href: "/dashboard/admin/revenue", Icon: BarChart3, roles: ["platform_admin"] },
  { key: "platform-forecast", href: "/dashboard/admin/forecast", Icon: TrendingUp, roles: ["platform_admin"] },
];

const PLATFORM_ADMIN_SYSTEM_LINKS: NavLink[] = [
  { key: "platform-health", href: "/dashboard/platform-health", Icon: Activity, roles: ["platform_admin"] },
  { key: "platform-services", href: "/dashboard/services", Icon: Wrench, roles: ["platform_admin"] },
  { key: "platform-settings", href: "/dashboard/settings", Icon: Settings, roles: ["platform_admin"] },
  { key: "platform-templates", href: "/dashboard/templates", Icon: FileEdit, roles: ["platform_admin"] },
  { key: "platform-audit", href: "/dashboard/audit-logs", Icon: Shield, roles: ["platform_admin"] },
  { key: "platform-users", href: "/dashboard/users", Icon: Users, roles: ["platform_admin"] },
];

// ─── Support Role Categories ─────────────────────────────────────────────────

const SUPPORT_TENANTS_LINKS: NavLink[] = [
  { key: "support-tenants", href: "/dashboard/admin/tenants", Icon: Building2, roles: ["support"] },
];

// ─── Full Navigation Tree ─────────────────────────────────────────────────────

export const NAV_CONFIG: (NavLink | NavCategory)[] = [
  homeLinks.admin,
  homeLinks.manager,
  homeLinks.employee,
  homeLinks.customer,
  homeLinks.platform_admin,
  homeLinks.support,
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
  // ── Platform Admin Navigation ──
  {
    key: "platform-plattform",
    roles: ["platform_admin"],
    children: PLATFORM_ADMIN_TENANTS_LINKS,
  },
  {
    key: "platform-finanzen",
    roles: ["platform_admin"],
    children: PLATFORM_ADMIN_REVENUE_LINKS,
  },
  {
    key: "platform-system",
    roles: ["platform_admin"],
    children: PLATFORM_ADMIN_SYSTEM_LINKS,
  },
  // ── Support Navigation ──
  {
    key: "support-mandanten",
    roles: ["support"],
    children: SUPPORT_TENANTS_LINKS,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getFlatNavForRole(role: UserRole): NavLink[] {
  return NAV_CONFIG.filter((item): item is NavLink => !("children" in item) && item.roles.includes(role));
}

export function getCategoriesForRole(role: UserRole): NavCategory[] {
  return NAV_CONFIG
    .filter((item): item is NavCategory => "children" in item && item.children.some((c) => c.roles.includes(role)))
    .map((cat) => ({
      ...cat,
      children: cat.children.filter((c) => c.roles.includes(role)),
    }));
}

export function getAllNavItemsForRole(role: UserRole): NavLink[] {
  const links = getFlatNavForRole(role);
  const categories = getCategoriesForRole(role);
  return [...links, ...categories.flatMap((c) => c.children)];
}

export function getHomeHref(role: UserRole): string {
  return homeLinks[role].href;
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export const NAV_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "planning": "Planung",
  "employee-dashboard": "Dashboard",
  "portal-dashboard": "Dashboard",
  "platform-overview": "Übersicht",
  "support-overview": "Übersicht",
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
  // Platform Admin
  "platform-plattform": "Plattform",
  "platform-finanzen": "Finanzen",
  "platform-system": "System",
  "platform-tenants": "Mandanten",
  "platform-revenue": "Umsatz",
  "platform-forecast": "Prognose",
  "platform-health": "Platform Health",
  "platform-services": "Services",
  "platform-settings": "Einstellungen",
  "platform-templates": "Vorlagen",
  "platform-audit": "Audit-Logs",
  "platform-users": "Benutzer",
  // Support
  "support-mandanten": "Mandanten",
  "support-tenants": "Mandanten",
  "tenants": "Mandanten",
};

export function getNavLabel(key: string): string {
  return NAV_LABELS[key] ?? key;
}
