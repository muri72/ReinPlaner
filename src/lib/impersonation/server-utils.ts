import { headers } from "next/headers";
import { IMPERSONATION_STORAGE_KEY } from "./constants";

/**
 * Get the impersonation metadata from request headers (sent from client)
 * This allows server actions to know if an impersonation is active
 */
export async function getImpersonationFromHeaders(): Promise<{
  sessionId?: string;
  impersonatedUserId?: string;
  adminUserId?: string;
} | null> {
  try {
    const h = await headers();
    const impersonationData = h.get("x-impersonation-data");

    if (!impersonationData) {
      return null;
    }

    // The client can send impersonation data via headers
    const parsed = JSON.parse(impersonationData);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Utility for server actions to determine which user ID to use
 * Returns the impersonated user ID if impersonation is active, otherwise the current user's ID
 */
export async function getEffectiveUserId(
  currentUserId: string | null
): Promise<string | null> {
  if (!currentUserId) {
    return null;
  }

  const impersonationData = await getImpersonationFromHeaders();

  // If impersonation is active and the current user matches the admin user,
  // use the impersonated user ID
  if (
    impersonationData &&
    impersonationData.adminUserId === currentUserId &&
    impersonationData.impersonatedUserId
  ) {
    return impersonationData.impersonatedUserId;
  }

  return currentUserId;
}

/**
 * Check if the current user is impersonating someone else
 */
export async function isImpersonating(
  currentUserId: string | null
): Promise<boolean> {
  const impersonationData = await getImpersonationFromHeaders();
  return !!(
    impersonationData &&
    impersonationData.adminUserId === currentUserId &&
    impersonationData.impersonatedUserId
  );
}
