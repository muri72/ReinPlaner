"use client";

import { createClient } from "@/lib/supabase/client";
import { IMPERSONATION_STORAGE_KEY, type ImpersonationMeta } from "./constants";

/**
 * Get the current impersonation metadata from localStorage
 */
export function getImpersonationMeta(): ImpersonationMeta | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if impersonation is currently active
 */
export function isImpersonating(): boolean {
  const meta = getImpersonationMeta();
  if (!meta) return false;

  // Check if session is still active (you might want to add expiry logic)
  return true;
}

/**
 * Add impersonation headers to a Supabase client request
 * This should be called before making authenticated requests
 */
export function addImpersonationHeaders(supabase: ReturnType<typeof createClient>) {
  const meta = getImpersonationMeta();

  if (!meta) {
    return supabase;
  }

  // The headers will be automatically sent with the request
  // Supabase doesn't support custom headers easily, so we store this in a different way
  // Alternative: Add as a query parameter or use the metadata in requests

  return supabase;
}

/**
 * Modify queries to include impersonation context
 * Use this when you need to filter queries by the impersonated user
 */
export function getEffectiveUserIdForQuery(): string | null {
  const meta = getImpersonationMeta();

  // If impersonating, return the impersonated user ID
  if (meta) {
    return meta.impersonatedUserId;
  }

  // Otherwise, get current user ID
  const supabase = createClient();
  // This would be called in a React context, so it returns a Promise
  // In practice, you'd use this in a useEffect or useMemo
  return null;
}
