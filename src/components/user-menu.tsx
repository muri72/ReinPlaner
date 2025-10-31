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
import { Moon, Sun, User, LogOut, UsersRound, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { ImpersonationDialog } from "@/components/impersonation-dialog";
import { IMPERSONATION_STORAGE_KEY } from "../lib/impersonation/constants";

interface UserMenuProps {
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  onSignOut: () => Promise<void>;
  // Accept userProfile directly as a prop
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string; // Include role in userProfile type
  } | null;
}

export function UserMenu({ currentUserRole, onSignOut, userProfile }: UserMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile(); // Use the hook
  const [isImpersonationDialogOpen, setIsImpersonationDialogOpen] = useState(false);

  // Use the passed userProfile directly
  const profile = userProfile;
  const loading = profile === null; // Determine loading based on whether profile data is available

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
    await onSignOut();
    toast.success("Erfolgreich abgemeldet!");
    router.push("/login");
  };

  const displayName = profile?.first_name || profile?.last_name ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Mein Profil";
  const avatarFallback = profile?.first_name?.[0] || profile?.last_name?.[0] || 'U';

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 animate-pulse">
        <User className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 glassmorphism-card" align="end" forceMount>
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
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/users">
                  <UsersRound className="mr-2 h-4 w-4" />
                  <span>Benutzerverwaltung</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setIsImpersonationDialogOpen(true);
                }}
              >
                <UserCog className="mr-2 h-4 w-4" />
                <span>Account impersonieren</span>
              </DropdownMenuItem>
            </>
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

      <ImpersonationDialog
        open={isImpersonationDialogOpen}
        onOpenChange={setIsImpersonationDialogOpen}
      />
    </>
  );
}