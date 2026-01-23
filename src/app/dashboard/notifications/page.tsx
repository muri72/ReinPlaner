import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notification-list";
import { NotificationType } from "@/lib/actions/notifications";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: NotificationType;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const typedNotifications: Notification[] = (notifications || []).map((n) => ({
    ...n,
    type: (n.type as NotificationType) || "default",
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Benachrichtigungen</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bleiben Sie auf dem Laufenden
            </p>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <NotificationList
        initialNotifications={typedNotifications}
        userId={user.id}
      />
    </div>
  );
}
