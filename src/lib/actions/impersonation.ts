"use server";

import { auth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { profiles, impersonationSessions, notifications } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { headers } from "next/headers";

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

export async function listImpersonationTargets(): Promise<
  ActionResponse<{
    admin: { id: string; fullName: string };
    targets: ImpersonationTarget[];
  }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  const adminProfile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.id, session.user.id),
  });

  if (!adminProfile || adminProfile.role !== "admin") {
    return { success: false, message: "Nur Administratoren dürfen impersonieren." };
  }

  const adminFullName = adminProfile.fullName || "Administrator";

  // Get all profiles except the current admin
  const allProfiles = await db.query.profiles.findMany({
    where: (profiles, { eq, ne }) => ne(profiles.id, session.user.id),
  });

  const targets: ImpersonationTarget[] = allProfiles
    .map(profile => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName || profile.email || "Unbekannter Nutzer",
      role: profile.role ?? "employee",
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "de"));

  return {
    success: true,
    message: "Nutzer erfolgreich geladen.",
    data: {
      admin: { id: session.user.id, fullName: adminFullName },
      targets,
    },
  };
}

export async function startImpersonation(targetUserId: string): Promise<ActionResponse<ImpersonationSessionPayload>> {
  if (!targetUserId) {
    return { success: false, message: "Bitte einen Zielnutzer auswählen." };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  const adminProfile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.id, session.user.id),
  });

  if (!adminProfile || adminProfile.role !== "admin") {
    return { success: false, message: "Nur Administratoren dürfen impersonieren." };
  }

  if (targetUserId === session.user.id) {
    return { success: false, message: "Sie können nicht sich selbst impersonieren." };
  }

  const [targetProfile, adminFullName] = await Promise.all([
    db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, targetUserId),
    }),
    Promise.resolve(adminProfile.fullName || "Administrator"),
  ]);

  if (!targetProfile) {
    return { success: false, message: "Zielnutzer nicht gefunden." };
  }

  const targetFullName =
    [targetProfile.fullName].filter(Boolean).join(" ").trim() ||
    targetProfile.email ||
    "Unbekannter Nutzer";

  // Get request headers for logging
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for") || requestHeaders.get("x-real-ip") || null;
  const userAgent = requestHeaders.get("user-agent") || null;

  // Create impersonation session record
  const [newSessionRecord] = await db
    .insert(impersonationSessions)
    .values({
      adminUserId: session.user.id,
      impersonatedUserId: targetUserId,
      impersonatedRole: targetProfile.role ?? "employee",
      sessionMetadata: {
        adminName: adminFullName,
        impersonatedName: targetFullName,
      },
      ipAddress: ipAddress,
      userAgent: userAgent,
    })
    .returning();

  if (!newSessionRecord) {
    return { success: false, message: "Impersonation konnte nicht protokolliert werden." };
  }

  // Send notification to the impersonated user
  try {
    await db.insert(notifications).values({
      profileId: targetUserId,
      title: "Impersonierung gestartet",
      message: `Administrator ${adminFullName} hat am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} eine Impersonierung Ihrer Sitzung gestartet.`,
      link: "/dashboard/profile",
      type: "system",
    });
  } catch (notificationError) {
    // Log but don't fail the impersonation if notification fails
    console.error("[IMPERSONATION] Failed to send notification:", notificationError);
  }

  return {
    success: true,
    message: `${targetFullName} wird nun impersoniert.`,
    data: {
      impersonationSessionId: newSessionRecord.id,
      admin: {
        id: session.user.id,
        fullName: adminFullName,
        email: adminProfile.email ?? null,
      },
      impersonated: {
        id: targetUserId,
        fullName: targetFullName,
        role: targetProfile.role ?? "employee",
      },
    },
  };
}

export async function stopImpersonation(impersonationSessionId: string): Promise<ActionResponse<RevertSessionPayload>> {
  if (!impersonationSessionId) {
    return { success: false, message: "Keine Impersonation-Session angegeben." };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Nicht authentifiziert." };
  }

  // Get the session record
  const sessionRecord = await db.query.impersonationSessions.findFirst({
    where: (impersonationSessions, { eq }) => eq(impersonationSessions.id, impersonationSessionId),
  });

  if (!sessionRecord) {
    return { success: false, message: "Diese Impersonation-Session wurde nicht gefunden." };
  }

  if (!sessionRecord.isActive) {
    return { success: false, message: "Diese Impersonation-Session ist bereits beendet." };
  }

  if (sessionRecord.impersonatedUserId !== session.user.id && sessionRecord.adminUserId !== session.user.id) {
    return { success: false, message: "Sie sind nicht berechtigt, diese Impersonation zu beenden." };
  }

  // Mark the impersonation session as inactive
  await db
    .update(impersonationSessions)
    .set({
      isActive: false,
      endedAt: new Date(),
    })
    .where(eq(impersonationSessions.id, impersonationSessionId));

  return {
    success: true,
    message: "Impersonation beendet.",
    data: {
      message: "Impersonation beendet. Bitte melden Sie sich neu an.",
    },
  };
}