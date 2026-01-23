"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { NotificationItem } from "@/components/notification-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationType } from "@/lib/actions/notifications";
import {
  CheckCheck,
  Trash2,
  RefreshCw,
  Bell,
  Check,
  Archive,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: NotificationType;
}

type FilterType = "all" | "unread" | "read";

interface NotificationListProps {
  initialNotifications: Notification[];
  userId: string;
  onRefresh?: () => void;
}

export function NotificationList({
  initialNotifications,
  userId,
  onRefresh,
}: NotificationListProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialNotifications.length >= 20);
  const [lastId, setLastId] = useState<string | null>(
    initialNotifications.length > 0
      ? initialNotifications[initialNotifications.length - 1].id
      : null
  );

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const loadMore = useCallback(async () => {
    if (!lastId || loading) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .lt("id", lastId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      setNotifications((prev) => [...prev, ...data]);
      setLastId(data[data.length - 1].id);
      setHasMore(data.length >= 20);
    } else {
      setHasMore(false);
    }

    setLoading(false);
  }, [lastId, loading, supabase, userId]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Fehler beim Markieren als gelesen:", error);
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Fehler beim Löschen:", error);
      // Revert on error - reload all
      if (onRefresh) onRefresh();
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!confirm("Möchten Sie wirklich alle Benachrichtigungen löschen?")) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (!error) {
      setNotifications([]);
    }
    setLoading(false);
  };

  const handleDeleteRead = async () => {
    if (!confirm("Möchten Sie alle gelesenen Benachrichtigungen löschen?")) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("is_read", true);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-card/50 border">
        <div className="flex gap-1 p-1 rounded-md bg-muted/50">
          {(["all", "unread", "read"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" && "Alle"}
              {f === "unread" && "Ungelesen"}
              {f === "read" && "Gelesen"}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Alle als gelesen
            </Button>
          )}
          {notifications.some((n) => n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteRead}
              disabled={loading}
            >
              <Archive className="w-4 h-4 mr-1.5" />
              Gelesene löschen
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Alle löschen
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">Keine Benachrichtigungen</p>
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Sie haben keine Benachrichtigungen."
                : filter === "unread"
                  ? "Alle Benachrichtigungen wurden gelesen."
                  : "Keine gelesenen Benachrichtigungen."}
            </p>
          </div>
        ) : (
          <>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                showActions
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Lädt...
                    </>
                  ) : (
                    "Mehr laden"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
