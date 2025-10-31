import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

interface ImpersonationStartPayload {
  actionLink: string;
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
  actionLink: string;
  message: string;
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

  const supabaseAdmin = createAdminClient();

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
    (profiles ?? []).map((profile: any) => [
      profile.id,
      {
        fullName: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim(),
        role: profile.role ?? "employee",
      },
    ])
  );

  const targets: ImpersonationTarget[] = (authUsersResult.users ?? [])
    .filter((authUser: any) => authUser.id !== user.id)
    .map((authUser: any) => {
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

export async function startImpersonation(targetUserId: string): Promise<ActionResponse<ImpersonationStartPayload>> {
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
    .select("first_name, last_name, role")
    .eq("id", adminUser.id)
    .single();

  if (adminProfileError || adminProfile?.role !== "admin") {
    return { success: false, message: "Nur Administratoren dürfen impersonieren." };
  }

  if (targetUserId === adminUser.id) {
    return { success: false, message: "Sie können nicht sich selbst impersonieren." };
  }

  const supabaseAdmin = createAdminClient();

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

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const redirectUrl = `${protocol}://${host}/auth/callback/impersonate`;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: authUserResult.user?.email!,
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { success: false, message: linkError?.message ?? "Konnte keinen Magic-Link für die Impersonation erzeugen." };
  }

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
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !newSessionRecord) {
    return { success: false, message: insertError?.message ?? "Impersonation konnte nicht protokolliert werden." };
  }

  return {
    success: true,
    message: `${targetFullName} wird nun impersoniert.`,
    data: {
      actionLink: linkData.properties.action_link,
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

  const supabaseAdmin = createAdminClient();

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
  const { data: adminUserResult, error: adminLoadError } = await supabaseAdmin.auth.admin.getUserById(sessionRecord.admin_user_id);
  if (adminLoadError || !adminUserResult?.user?.email) {
    return { success: false, message: adminLoadError?.message ?? "Admin-Benutzer konnte nicht geladen werden." };
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const redirectUrl = `${protocol}://${host}/auth/callback/impersonate`;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: adminUserResult.user.email!,
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { success: false, message: linkError?.message ?? "Konnte keinen Magic-Link für die Admin-Sitzung erzeugen." };
  }

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
      actionLink: linkData.properties.action_link,
      message: "Impersonation beendet. Willkommen zurück!",
    },
  };
}