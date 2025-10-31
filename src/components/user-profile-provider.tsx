"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  refresh: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { meta, isImpersonating } = useImpersonation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      let profileToLoad: UserProfile | null = null;

      if (isImpersonating && meta) {
        console.log("[IMPERSONATION] Loading profile for impersonated user:", meta.impersonatedUserId);

        // When impersonating, we need to load the impersonated user's profile
        // We need to fetch it manually since RLS might prevent access
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role')
          .eq('id', meta.impersonatedUserId)
          .single();

        if (!error && data) {
          profileToLoad = {
            first_name: data.first_name,
            last_name: data.last_name,
            avatar_url: data.avatar_url,
            // Use the impersonated role from metadata, not the database
            role: meta.impersonatedRole,
          };
        } else {
          // Fallback to metadata if database query fails
          profileToLoad = {
            first_name: meta.impersonatedName.split(' ')[0] || 'Unbekannt',
            last_name: meta.impersonatedName.split(' ').slice(1).join(' ') || '',
            avatar_url: null,
            role: meta.impersonatedRole,
          };
        }
      } else {
        // Load current user's profile
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role')
          .single();

        if (!error && data) {
          profileToLoad = data;
        }
      }

      setUserProfile(profileToLoad);
    } catch (error) {
      console.error("Error loading profile:", error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[USER_PROFILE_PROVIDER] useEffect triggered:", { isImpersonating, hasMeta: !!meta, meta });
    loadProfile();
  }, [isImpersonating, meta]);

  const currentUserRole = (userProfile?.role as any) || 'employee';

  const displayName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Unbekannter Nutzer"
    : "Lädt...";

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        currentUserRole,
        displayName,
        loading,
        refresh: loadProfile,
      }}
    >
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
