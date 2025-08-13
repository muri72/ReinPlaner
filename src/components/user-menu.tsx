"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun, User, Settings, LogOut, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface UserMenuProps {
  children: React.ReactNode; // Akzeptiert einen Trigger als Kind
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
}

export function UserMenu({ children, currentUserRole, onSignOut }: UserMenuProps) {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<{ firstName: string | null; lastName: string | null; avatarUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Fehler beim Laden des Profils:", error);
          toast.error("Fehler beim Laden Ihrer Profildaten.");
        } else if (data) {
          setProfile({
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.avatar_url,
          });
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleSignOut = async () => {
    await onSignOut();
    toast.success("Erfolgreich abgemeldet!");
    router.push("/login");
  };

  const displayName = profile?.firstName || profile?.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : "Mein Profil";
  const avatarFallback = profile?.firstName?.[0] || profile?.lastName?.[0] || 'U';

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 animate-pulse">
        <User className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children} {/* Der übergebene Trigger wird hier gerendert */}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Profil</span>
          </Link>
        </DropdownMenuItem>
        {currentUserRole === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/users">
              <UsersRound className="mr-2 h-4 w-4" />
              <span>Benutzerverwaltung</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {theme === "dark" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <span>Dark Mode</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Abmelden</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}