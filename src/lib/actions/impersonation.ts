"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

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
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
    token_type: string;
  };
}

interface RevertSessionPayload {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
    token_type: string;
  };
  message: string;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!serviceRoleKey) {
    throw new Error("Environment variable SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Hilfsfunktion: Magic-Link folgen und Tokens extrahieren
async function getSessionTokensFromMagicLink(actionLink: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}> {
  // Wir rufen den Magic-Link auf und folgen Weiterleitungen
  const res = await fetch(actionLink, {
    method: "GET",
    redirect: "follow",
  });

  // Die finale URL enthält die Tokens als Query-Parameter (?access_token=...&refresh_token=...)
  const finalUrl = res.url;
  const urlObj = new URL(finalUrl);

  const access_token = urlObj.searchParams.get("access_token");
  const refresh_token = urlObj.searchParams.get("refresh_token");
  const expires_in = urlObj.searchParams.get("expires_in")
    ? Number(urlObj.searchParams.get("expires_in"))
    : undefined;
  const token_type = urlObj.searchParams.get("token_type") || undefined;

  if (!access_token || !refresh_token) {
    throw new Error("Magic-Link hat keine Session-Tokens geliefert.");
  }

  return { access_token, refresh_token, expires_in, token_type };
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

  // Magic Link für den Zielnutzer erzeugen
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: authUserResult.user?.email!,
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { success: false, message: linkError?.message ?? "Konnte keinen Magic-Link für die Impersonation erzeugen." };
  }

  // Magic-Link aufrufen und Tokens extrahieren
  const tokens = await getSessionTokensFromMagicLink(linkData.properties.action_link);

  const nowIso = new Date().toISOString();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for") || requestHeaders.get("x-real-ip") || null;
  const userAgent = requestHeaders.get("user-agent") || null;

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
      started_at: nowIso,
    })
    .select("id")
    .single();

  if (insertError || !newSessionRecord) {
    return { success: false, message: insertError?.message ?? "Impersonation konnte nicht protokolliert werden." };
  }

  // Session-Payload zusammenstellen
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
      session: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
        expires_in: tokens.expires_in ?? 3600,
        token_type: tokens.token_type ?? "bearer",
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

  // Magic Link für den ursprünglichen Admin erzeugen
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: (await supabaseAdmin.auth.admin.getUserById(sessionRecord.admin_user_id)).data.user?.email!,
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { success: false, message: linkError?.message ?? "Konnte keinen Magic-Link für die Admin-Sitzung erzeugen." };
  }

  // Tokens für den Admin aus dem Magic-Link extrahieren
  const tokens = await getSessionTokensFromMagicLink(linkData.properties.action_link);

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

  return {
    success: true,
    message: "Impersonation beendet. Sie sind wieder als Administrator angemeldet.",
    data: {
      session: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
        expires_in: tokens.expires_in ?? 3600,
        token_type: tokens.token_type ?? "bearer",
      },
      message: "Impersonation beendet. Willkommen zurück!",
    },
  };
}