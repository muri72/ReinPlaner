"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useImpersonation } from "@/lib/impersonation/context";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  currentUserRole: 'admin' | 'manager' | 'employee' | 'customer';
  displayName: string;
  loading: boolean;
  authenticated: boolean;
  refresh: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { meta, isImpersonating } = useImpersonation();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setAuthenticated(false);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const user = session.user;

      setAuthenticated(true);

      // Handle impersonation
      if (isImpersonating && meta) {
        const profileToLoad: UserProfile = {
          first_name: meta.impersonatedName.split(' ')[0] || 'Unbekannt',
          last_name: meta.impersonatedName.split(' ').slice(1).join(' ') || '',
          avatar_url: null,
          role: meta.impersonatedRole,
        };
        setUserProfile(profileToLoad);
        setLoading(false);
        return;
      }

      // Fetch profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // Create default profile on error
        setUserProfile({
          first_name: user.email?.split('@')[0] || 'User',
          last_name: '',
          avatar_url: null,
          role: 'employee',
        });
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      // Set default profile to prevent infinite loading
      setUserProfile({
        first_name: 'User',
        last_name: '',
        avatar_url: null,
        role: 'employee',
      });
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, [isImpersonating, meta]);

  useEffect(() => {
    let mounted = true;

    loadProfile().then(() => {
      if (!mounted) return;

      const supabase = createClient();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            await loadProfile();
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const currentUserRole = useMemo(() => {
    if (isImpersonating && meta?.impersonatedRole) {
      return meta.impersonatedRole as 'admin' | 'manager' | 'employee' | 'customer';
    }

    return (userProfile?.role as any) || 'employee';
  }, [userProfile?.role, isImpersonating, meta]);

  const displayName = useMemo(() => {
    if (isImpersonating && meta?.impersonatedName) {
      return meta.impersonatedName;
    }

    if (!userProfile) return "Lädt...";
    return [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Unbekannter Nutzer";
  }, [userProfile, isImpersonating, meta]);

  const contextValue = useMemo(() => ({
    userProfile,
    currentUserRole,
    displayName,
    loading,
    authenticated,
    refresh: loadProfile,
  }), [userProfile, currentUserRole, displayName, loading, authenticated, loadProfile]);

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
