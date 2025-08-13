"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, BellRing } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  children: React.ReactNode; // Akzeptiert einen Trigger als Kind
}

export function NotificationBell({ children }: NotificationBellProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
      if (error) {
        console.error("Fehler beim Laden der Benachrichtigungen:", error);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          fetchNotifications(); // Bei jeder Änderung neu laden
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children} {/* Der übergebene Trigger wird hier gerendert */}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Benachrichtigungen</h4>
            <p className="text-sm text-muted-foreground">
              Sie haben {unreadCount} ungelesene Nachrichten.
            </p>
          </div>
          <div className="grid gap-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground">Keine neuen Benachrichtigungen.</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded-md ${!notification.is_read ? 'bg-secondary' : ''}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <Link href={notification.link || '/dashboard'} passHref>
                    <div className="cursor-pointer">
                      <p className="font-semibold">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}