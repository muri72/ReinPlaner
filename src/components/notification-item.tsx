"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Package,
  Clock,
  Ticket,
  Settings,
  Umbrella,
  Bell,
  Trash2,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationType } from "@/lib/actions/notifications";

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
    type: NotificationType;
  };
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  order: {
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  shift: {
    icon: Clock,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  ticket: {
    icon: Ticket,
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  system: {
    icon: Settings,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
  absence: {
    icon: Umbrella,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  default: {
    icon: Bell,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  showActions = true,
}: NotificationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRead, setIsRead] = useState(notification.is_read);

  const config = typeConfig[notification.type] || typeConfig.default;
  const Icon = config.icon;

  const handleClick = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
      setIsRead(true);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    if (onDelete) {
      await onDelete(notification.id);
    }
    setIsDeleting(false);
  };

  return (
    <div
      className={cn(
        "group relative p-4 rounded-lg border transition-all duration-200",
        isRead
          ? "bg-background/50 border-border/50"
          : "bg-card border-primary/20 shadow-sm",
        isDeleting && "opacity-50"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            config.bgColor
          )}
        >
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "font-semibold text-sm",
                isRead ? "text-foreground" : "text-foreground"
              )}
            >
              {notification.title}
            </p>
            {!isRead && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
            )}
          </div>

          {notification.message && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {notification.message}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: de,
              })}
            </span>

            {showActions && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {notification.link && (
                  <Link
                    href={notification.link}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Öffnen"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
                {!isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isRead && onMarkAsRead) {
                        onMarkAsRead(notification.id);
                        setIsRead(true);
                      }
                    }}
                    title="Als gelesen markieren"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  title="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
