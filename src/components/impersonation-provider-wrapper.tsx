"use client";

import { SessionContextProvider } from "@/components/supabase-session-provider";
import { ImpersonationProvider } from "@/lib/impersonation/context";
import { UserProfileProvider } from "@/components/user-profile-provider";

export function ImpersonationProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionContextProvider initialSession={null}>
      <ImpersonationProvider>
        <UserProfileProvider>
          {children}
        </UserProfileProvider>
      </ImpersonationProvider>
    </SessionContextProvider>
  );
}
