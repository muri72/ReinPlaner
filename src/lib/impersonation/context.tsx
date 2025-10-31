"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMPERSONATION_STORAGE_KEY, type ImpersonationMeta } from "./constants";

interface ImpersonationContextType {
  meta: ImpersonationMeta | null;
  isImpersonating: boolean;
  originalUser: { id: string; email: string | null } | null;
  impersonatedUser: { id: string; name?: string; role?: string } | null;
  stopImpersonation: () => Promise<void>;
  refetchUser: () => Promise<void>;
  triggerReinit: () => void; // Force re-initialization (for clearing state)
  setImpersonationMeta: (meta: ImpersonationMeta) => void; // Set metadata for starting impersonation
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email: string | null } | null>(null);
  const [initKey, setInitKey] = useState(0); // For triggering re-initialization
  const loadedMetaRef = useRef<ImpersonationMeta | null>(null); // Track loaded metadata

  // Fetch initial data
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load impersonation metadata from localStorage
    const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    let loadedMeta: ImpersonationMeta | null = null;

    if (raw) {
      try {
        loadedMeta = JSON.parse(raw);
        loadedMetaRef.current = loadedMeta;
      } catch {
        window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      }
    }

    // Get current Supabase user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setSupabaseUser({ id: data.user.id, email: data.user.email ?? null });

        // NOW validate metadata against current user
        if (loadedMeta && data.user.id === loadedMeta.adminUserId) {
          // Current user is the admin who started impersonation
          // Check if it's valid (admin impersonating someone else)
          if (loadedMeta.adminUserId === loadedMeta.impersonatedUserId) {
            window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
            setMeta(null);
            loadedMetaRef.current = null;
          } else {
            // Valid impersonation - keep the metadata
            setMeta(loadedMeta);
          }
        } else if (loadedMeta && data.user.id !== loadedMeta.adminUserId) {
          // Current user is not the admin who started impersonation
          // This could happen if the admin logged out and someone else logged in
          // Or if the impersonation was started by a different admin
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          setMeta(null);
          loadedMetaRef.current = null;
        } else if (!loadedMeta) {
          // No metadata - normal login
          setMeta(null);
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUser({ id: session.user.id, email: session.user.email ?? null });
      } else {
        setSupabaseUser(null);
        // Clear impersonation if user logs out
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        }
        setMeta(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initKey]); // Re-run when initKey changes (for optimistic updates)

  // Determine the actual user context
  const actualUser = meta && supabaseUser
    ? supabaseUser.id === meta.impersonatedUserId
      ? { id: meta.impersonatedUserId, name: meta.impersonatedName, role: meta.impersonatedRole }
      : supabaseUser.id === meta.adminUserId
      ? { id: meta.adminUserId, name: meta.adminName, role: "admin" }
      : { id: supabaseUser.id, email: supabaseUser.email }
    : supabaseUser
    ? { id: supabaseUser.id, email: supabaseUser.email }
    : null;

  // Impersonation is active when:
  // 1. Metadata exists (impersonation session stored)
  // 2. Current user is the admin (who started the impersonation)
  // 3. Admin is impersonating a DIFFERENT user (adminUserId !== impersonatedUserId)
  // Note: We use "view as" pattern - admin stays logged in but views with impersonated role
  const isImpersonating = !!(
    meta &&
    supabaseUser &&
    supabaseUser.id === meta.adminUserId &&
    meta.adminUserId !== meta.impersonatedUserId
  );

  const stopImpersonation = async () => {
    if (!meta) return;

    const supabase = createClient();

    // Sign out the impersonated user
    await supabase.auth.signOut();

    // Clear impersonation metadata
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
    setMeta(null);

    // TODO: Optionally trigger a refresh or redirect
  };

  const refetchUser = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setSupabaseUser({ id: data.user.id, email: data.user.email ?? null });
    }
  };

  // Force re-initialization (for clearing state, e.g., when stopping impersonation)
  const triggerReinit = () => {
    loadedMetaRef.current = null;
    setMeta(null);
    setInitKey(prev => prev + 1);
  };

  // Set impersonation metadata (for starting impersonation)
  const setImpersonationMeta = (meta: ImpersonationMeta) => {
    loadedMetaRef.current = meta;
    setMeta(meta);
    // Also update localStorage to persist across refreshes
    if (typeof window !== "undefined") {
      window.localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(meta));
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{
        meta,
        isImpersonating,
        originalUser: supabaseUser,
        impersonatedUser: actualUser as any,
        stopImpersonation,
        refetchUser,
        triggerReinit,
        setImpersonationMeta,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}

// Helper hook to get the current user ID (respecting impersonation)
export function useCurrentUserId(): string | null {
  const { isImpersonating, meta, originalUser } = useImpersonation();
  if (isImpersonating && meta) {
    return meta.impersonatedUserId;
  }
  return originalUser?.id ?? null;
}

// Helper hook to check if current user is admin
export function useIsAdmin(): boolean {
  const { isImpersonating, meta } = useImpersonation();
  if (isImpersonating && meta) {
    return meta.impersonatedRole === "admin";
  }
  // For non-impersonating users, check via server-side or another method
  return false;
}
