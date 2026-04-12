"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { sendNotification } from "@/lib/actions/notifications";

interface ActionResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface ImpersonationTarget {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
}

interface ImpersonationSessionPayload {
  impersonationSessionId: string;
  admin: {
    id: string;
    fullName: string;
    email: string | null;
  };
  impersonated: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface RevertSessionPayload {
  message: string;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!serviceRoleKey) {
    throw new Error('Environment variable SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function listImpersonationTargets(): Promise<
  ActionResponse<{
    admin: { id: string; fullName: string };
    targets: ImpersonationTarget[];
  }>
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .single();

  if (adminProfileError || adminProfile?.role !== "admin") {
    return { success: false, message: "Nur Administratoren dürfen impersonieren." };
  }

  const adminFullName = [adminProfile.first_name, adminProfile.last_name].filter(Boolean).join(" ").trim() || "Administrator";
  const supabaseAdmin = getSupabaseAdminClient();

  const [
    { data: authUsersResult, error: authUsersError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from("profiles").select("id, first_name, last_name, role")
  ]);

  if (authUsersError) {
    return { success: false, message: authUsersError.message };
  }

  if (profilesError) {
    return { success: false, message: profilesError.message };
  }

  const profilesMap = new Map(
    (profiles ?? []).map(profile => [
      profile.id,
      {
        fullName: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim(),
        role: profile.role ?? "employee",
      },
    ])
  );

  const targets: ImpersonationTarget[] = (authUsersResult.users ?? [])
    .filter(authUser => authUser.id !== user.id)
    .map(authUser => {
      const profileEntry = profilesMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        fullName: profileEntry?.fullName || authUser.email || "Unbekannter Nutzer",
        role: profileEntry?.role || "employee",
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "de"));

  return {
    success: true,
    message: "Nutzer erfolgreich geladen.",
    data: {
      admin: { id: user.id, fullName: adminFullName },
      targets,
    },
  };
}

export async function startImpersonation(targetUserId: string): Promise<ActionResponse<ImpersonationSessionPayload>> {
  if (!targetUserId) {
    return { success: false, message: "Bitte einen Zielnutzer auswählen." };
  }

  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, email_notifications_enabled")
    .eq("id", adminUser.id)
    .single();

  if (adminProfileError || adminProfile?.role !== "admin") {
    return { success: false, message: "Nur Administratoren dürfen impersonieren." };
  }

  if (targetUserId === adminUser.id) {
    return { success: false, message: "Sie können nicht sich selbst impersonieren." };
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const [{ data: targetProfile, error: targetProfileError }, { data: authUserResult, error: authUserError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", targetUserId)
        .single(),
      supabaseAdmin.auth.admin.getUserById(targetUserId),
    ]);

  if (targetProfileError) {
    return { success: false, message: targetProfileError.message };
  }

  if (authUserError) {
    return { success: false, message: authUserError.message };
  }

  const targetFullName =
    [targetProfile?.first_name, targetProfile?.last_name].filter(Boolean).join(" ").trim() ||
    authUserResult.user?.email ||
    "Unbekannter Nutzer";

  const adminFullName =
    [adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(" ").trim() || "Administrator";

  // Get request headers for logging
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for") || requestHeaders.get("x-real-ip") || null;
  const userAgent = requestHeaders.get("user-agent") || null;

  // Log the impersonation session for auditing purposes
  const { data: newSessionRecord, error: insertError } = await supabaseAdmin
    .from("impersonation_sessions")
    .insert({
      admin_user_id: adminUser.id,
      impersonated_user_id: targetUserId,
      impersonated_role: targetProfile?.role ?? "employee",
      session_metadata: {
        adminName: adminFullName,
        impersonatedName: targetFullName,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      started_at: new Date().toISOString(),
    })
    .select("id, session_metadata")
    .single();

  if (insertError || !newSessionRecord) {
    return { success: false, message: insertError?.message ?? "Impersonation konnte nicht protokolliert werden." };
  }

  // Send notification to the impersonated user about the impersonation session
  // Get the target user's user_id from auth to send notification
  const targetUserAuthId = authUserResult.user?.id;
  if (targetUserAuthId) {
    try {
      await sendNotification({
        userId: targetUserAuthId,
        title: "Impersonierung gestartet",
        message: `Administrator ${adminFullName} hat am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} eine Impersonierung Ihrer Sitzung gestartet.`,
        link: "/dashboard/profile",
        type: "system",
      });
    } catch (notificationError) {
      // Log but don't fail the impersonation if notification fails
      console.error("[IMPERSONATION] Failed to send notification:", notificationError);
    }
  }

  // Note: We use a "view as" pattern for impersonation.
  // The admin stays logged in as themselves, but views the system with the impersonated user's role.
  // Metadata is stored locally to track the impersonation session.
  // This allows admins to see how the system appears to other user roles without actually switching accounts.

  return {
    success: true,
    message: `${targetFullName} wird nun impersoniert.`,
    data: {
      impersonationSessionId: newSessionRecord.id,
      admin: {
        id: adminUser.id,
        fullName: adminFullName,
        email: adminUser.email ?? null,
      },
      impersonated: {
        id: targetUserId,
        fullName: targetFullName,
        role: targetProfile?.role ?? "employee",
      },
    },
  };
}

export async function stopImpersonation(impersonationSessionId: string): Promise<ActionResponse<RevertSessionPayload>> {
  if (!impersonationSessionId) {
    return { success: false, message: "Keine Impersonation-Session angegeben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const { data: sessionRecord, error: sessionError } = await supabaseAdmin
    .from("impersonation_sessions")
    .select("id, admin_user_id, impersonated_user_id, is_active, started_at")
    .eq("id", impersonationSessionId)
    .single();

  if (sessionError || !sessionRecord) {
    return { success: false, message: "Diese Impersonation-Session wurde nicht gefunden." };
  }

  if (!sessionRecord.is_active) {
    return { success: false, message: "Diese Impersonation-Session ist bereits beendet." };
  }

  if (sessionRecord.impersonated_user_id !== user.id && sessionRecord.admin_user_id !== user.id) {
    return { success: false, message: "Sie sind nicht berechtigt, diese Impersonation zu beenden." };
  }

  // Mark the impersonation session as inactive
  const { error: updateError } = await supabaseAdmin
    .from("impersonation_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", impersonationSessionId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // The client-side context provider will handle the rest:
  // - Sign out the impersonated user
  // - Clear local impersonation metadata
  // - The admin user will need to sign back in manually

  return {
    success: true,
    message: "Impersonation beendet.",
    data: {
      message: "Impersonation beendet. Bitte melden Sie sich neu an.",
    },
  };
}