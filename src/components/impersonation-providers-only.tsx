"use client";

import { ImpersonationProvider } from "@/lib/impersonation/context";
import { UserProfileProvider } from "@/components/user-profile-provider";

export function ImpersonationProvidersOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ImpersonationProvider>
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </ImpersonationProvider>
  );
}
