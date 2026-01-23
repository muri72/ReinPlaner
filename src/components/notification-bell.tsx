"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellRing, CheckCheck, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Package,
  Clock,
  Ticket,
  Settings,
  Umbrella,
  Bell as BellIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationType } from "@/lib/actions/notifications";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: NotificationType;
}

const typeConfig: Record<
  NotificationType,
  { icon: typeof BellIcon; color: string; bgColor: string }
> = {
  order: { icon: Package, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  shift: { icon: Clock, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  ticket: { icon: Ticket, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  system: { icon: Settings, color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800/50" },
  absence: { icon: Umbrella, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  default: { icon: BellIcon, color: "text-primary", bgColor: "bg-primary/10" },
};

export function NotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(
        data.map((n) => ({
          ...n,
          type: (n.type as NotificationType) || "default",
        }))
      );
      setUnreadCount(data.length);
    }
    if (error) {
      console.error("Fehler beim Laden der Benachrichtigungen:", error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    await fetchNotifications();
    setLoading(false);
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-destructive" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-destructive rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 glassmorphism-card p-0"
        align="end"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">Benachrichtigungen</h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Alle lesen
            </Button>
          )}
        </div>

        {/* Notification List - Scrollable, max 5 items visible */}
        <div className="max-h-[320px] overflow-y-auto">
          {unreadNotifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-xs text-muted-foreground">
                Keine ungelesenen Benachrichtigungen
              </p>
              <Link href="/dashboard/notifications">
                <Button variant="link" size="sm" className="mt-2 h-8 text-xs">
                  Alle anzeigen
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="py-1">
              {unreadNotifications.slice(0, 10).map((notification) => {
                const config =
                  typeConfig[notification.type] || typeConfig.default;
                const Icon = config.icon;

                return (
                  <Link
                    key={notification.id}
                    href={notification.link || "/dashboard"}
                    className="block"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2 px-3 py-2 hover:bg-accent/50 transition-colors group">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      </div>

                      {/* Content - Compact */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate leading-tight">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true, locale: de }
                          )}
                        </p>
                      </div>

                      {/* Unread dot */}
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    </div>
                  </Link>
                );
              })}

              {unreadNotifications.length > 10 && (
                <div className="py-2 text-center border-t">
                  <Link href="/dashboard/notifications">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      +{unreadNotifications.length - 10} weitere
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t bg-muted/30">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs">
              <span>Alle Benachrichtigungen</span>
              <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
