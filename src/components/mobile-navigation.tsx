"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  GripVertical,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useUserProfile } from "@/components/user-profile-provider";

type UserRole = "admin" | "manager" | "employee" | "customer";

interface MobileNavigationProps {
  currentUserRole: UserRole;
  onSignOut: () => Promise<void>;
  notificationCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const MAX_VISIBLE_ITEMS = 4;
const STORAGE_KEY_PREFIX = "mobile-nav-preferences";

const getHomeLink = (role: UserRole) => {
  switch (role) {
    case "customer":
      return "/portal/dashboard";
    case "employee":
      return "/employee/dashboard";
    default:
      return "/dashboard";
  }
};

const createNavItem = (
  href: string,
  label: string,
  icon: LucideIcon,
): NavItem => ({
  id: href,
  href,
  label,
  icon,
});

const getNavItems = (role: UserRole): NavItem[] => {
  const items: NavItem[] = [
    createNavItem(getHomeLink(role), "Dashboard", Home),
  ];

  switch (role) {
    case "admin":
      items.push(
        createNavItem("/dashboard/orders", "Aufträge", Briefcase),
        createNavItem("/dashboard/objects", "Objekte", Building),
        createNavItem("/dashboard/planning", "Planung", CalendarCheck),
        createNavItem("/dashboard/employees", "Mitarbeiter", Users),
        createNavItem("/dashboard/finances", "Finanzen", DollarSign),
        createNavItem("/dashboard/reports", "Berichte", FileText),
        createNavItem("/dashboard/time-tracking", "Zeiterfassung", Clock),
        createNavItem("/dashboard/feedback", "Feedback", MessageSquare),
      );
      break;
    case "manager":
      items.push(
        createNavItem("/dashboard/orders", "Aufträge", Briefcase),
        createNavItem("/dashboard/objects", "Objekte", Building),
        createNavItem("/dashboard/planning", "Planung", CalendarCheck),
        createNavItem("/dashboard/employees", "Mitarbeiter", Users),
        createNavItem("/dashboard/finances", "Finanzen", DollarSign),
        createNavItem("/dashboard/feedback", "Feedback", MessageSquare),
      );
      break;
    case "employee":
      items.push(
        createNavItem("/dashboard/orders", "Aufträge", Briefcase),
        createNavItem("/dashboard/planning", "Planung", CalendarCheck),
        createNavItem("/dashboard/time-tracking", "Zeiterfassung", Clock),
        createNavItem("/dashboard/feedback", "Feedback", MessageSquare),
      );
      break;
    case "customer":
      items.push(
        createNavItem("/portal/dashboard/bookings", "Meine Buchungen", Briefcase),
        createNavItem("/dashboard/feedback", "Feedback", MessageSquare),
        createNavItem("/dashboard/tickets", "Tickets", FileText),
      );
      break;
    default:
      break;
  }

  return items;
};

export function MobileNavigation({
  currentUserRole,
  onSignOut,
  notificationCount = 0,
}: MobileNavigationProps) {
  const pathname = usePathname();
  const { userProfile } = useUserProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [visible, setVisible] = useState<string[]>([]);

  const navItems = useMemo(
    () => getNavItems(currentUserRole),
    [currentUserRole],
  );

  const defaultOrder = useMemo(
    () => navItems.map((item) => item.id),
    [navItems],
  );

  const storageKey = useMemo(
    () => `${STORAGE_KEY_PREFIX}:${currentUserRole}`,
    [currentUserRole],
  );

  const sanitizeAndSet = useCallback(
    (incomingOrder: string[], incomingVisible: string[]) => {
      if (!defaultOrder.length) {
        setOrder([]);
        setVisible([]);
        return;
      }

      const filteredOrder = incomingOrder.filter((id) =>
        defaultOrder.includes(id),
      );
      const mergedOrder = [
        ...filteredOrder,
        ...defaultOrder.filter((id) => !filteredOrder.includes(id)),
      ];

      const filteredVisible = incomingVisible
        .filter((id) => mergedOrder.includes(id))
        .slice(0, MAX_VISIBLE_ITEMS);

      const fallbackVisible = mergedOrder.slice(
        0,
        Math.min(MAX_VISIBLE_ITEMS, mergedOrder.length),
      );

      setOrder(mergedOrder);
      setVisible(filteredVisible.length > 0 ? filteredVisible : fallbackVisible);
    },
    [defaultOrder],
  );

  useEffect(() => {
    if (!defaultOrder.length) {
      setOrder([]);
      setVisible([]);
      return;
    }

    if (typeof window === "undefined") {
      sanitizeAndSet(defaultOrder, defaultOrder.slice(0, MAX_VISIBLE_ITEMS));
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          order?: string[];
          visible?: string[];
        };
        sanitizeAndSet(
          parsed.order ?? defaultOrder,
          parsed.visible ?? defaultOrder.slice(0, MAX_VISIBLE_ITEMS),
        );
      } else {
        sanitizeAndSet(defaultOrder, defaultOrder.slice(0, MAX_VISIBLE_ITEMS));
      }
    } catch {
      sanitizeAndSet(defaultOrder, defaultOrder.slice(0, MAX_VISIBLE_ITEMS));
    }
  }, [defaultOrder, sanitizeAndSet, storageKey]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !order.length ||
      !visible.length ||
      !storageKey
    ) {
      return;
    }

    const payload = JSON.stringify({ order, visible });
    localStorage.setItem(storageKey, payload);
  }, [order, visible, storageKey]);

  const orderedItems = useMemo(() => {
    if (!navItems.length) return [];
    if (!order.length) return navItems;
    const map = new Map(navItems.map((item) => [item.id, item]));
    const ordered = order
      .map((id) => map.get(id))
      .filter(Boolean) as NavItem[];
    const missing = navItems.filter((item) => !order.includes(item.id));
    return [...ordered, ...missing];
  }, [order, navItems]);

  const visibleItems = useMemo(() => {
    if (!orderedItems.length) return [];
    const items = orderedItems
      .filter((item) => visible.includes(item.id))
      .slice(0, MAX_VISIBLE_ITEMS);

    if (items.length > 0) return items;

    return orderedItems.slice(
      0,
      Math.min(MAX_VISIBLE_ITEMS, orderedItems.length),
    );
  }, [orderedItems, visible]);

  const moreItems = useMemo(
    () =>
      orderedItems.filter(
        (item) => !visibleItems.some((visibleItem) => visibleItem.id === item.id),
      ),
    [orderedItems, visibleItems],
  );

  const moveItem = (id: string, direction: "up" | "down") => {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];
      return updated;
    });
  };

  const toggleVisible = (id: string, checked: boolean) => {
    if (checked) {
      setVisible((prev) => {
        if (prev.includes(id)) return prev;
        if (prev.length >= MAX_VISIBLE_ITEMS) {
          toast.warning(
            `Du kannst maximal ${MAX_VISIBLE_ITEMS} Einträge im Schnellzugriff behalten.`,
          );
          return prev;
        }

        const updated = [...prev, id];
        updated.sort(
          (a, b) => order.indexOf(a) - order.indexOf(b),
        );
        return updated;
      });
    } else {
      setVisible((prev) => {
        if (!prev.includes(id)) return prev;
        if (prev.length <= 1) {
          toast.warning("Mindestens ein Eintrag muss im Schnellzugriff bleiben.");
          return prev;
        }
        return prev.filter((entry) => entry !== id);
      });
    }
  };

  const handleReset = () => {
    sanitizeAndSet(defaultOrder, defaultOrder.slice(0, MAX_VISIBLE_ITEMS));
    toast.success("Menü zurückgesetzt.");
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsManaging(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="mb-1 h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.href === "/dashboard/notifications" && notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              )}
            </Link>
          );
        })}

        <Sheet
          open={isMenuOpen}
          onOpenChange={(open) => {
            setIsMenuOpen(open);
            if (!open) {
              setIsManaging(false);
            }
          }}
        >
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center justify-center py-2 px-3 rounded-lg"
            >
              <Menu className="mb-1 h-5 w-5" />
              <span className="text-xs font-medium">Mehr</span>
              {moreItems.length === 0 && (
                <span className="sr-only">Alle Einträge sind im Schnellzugriff</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-[85vh] overflow-y-auto rounded-t-3xl border-t bg-background"
          >
            <SheetHeader className="px-4 pb-2 pt-4">
              <SheetTitle>Menü</SheetTitle>
            </SheetHeader>

            <div className="flex items-center justify-between px-4 pb-4">
              <div>
                <p className="text-sm font-semibold">
                  Schnellzugriff ({visible.length}/{MAX_VISIBLE_ITEMS})
                </p>
                <p className="text-xs text-muted-foreground">
                  Markiere bis zu {MAX_VISIBLE_ITEMS} Favoriten für die Leiste unten.
                </p>
              </div>
              <Button
                variant={isManaging ? "default" : "outline"}
                size="sm"
                onClick={() => setIsManaging((prev) => !prev)}
              >
                {isManaging ? "Fertig" : "Menü anpassen"}
              </Button>
            </div>

            {isManaging ? (
              <div className="space-y-3 px-4 pb-6">
                {orderedItems.map((item) => {
                  const index = order.indexOf(item.id);
                  const canMoveUp = index > 0;
                  const canMoveDown = index < order.length - 1;
                  const isVisible = visible.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.href}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveItem(item.id, "up")}
                            disabled={!canMoveUp}
                            aria-label={`${item.label} nach oben verschieben`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveItem(item.id, "down")}
                            disabled={!canMoveDown}
                            aria-label={`${item.label} nach unten verschieben`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`visible-${item.id}`}
                            checked={isVisible}
                            onCheckedChange={(checked) =>
                              toggleVisible(item.id, checked)
                            }
                          />
                          <label
                            htmlFor={`visible-${item.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Schnellzugriff
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                >
                  Zurücksetzen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pb-8">
                {orderedItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.href}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}