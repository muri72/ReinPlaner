"use client";

import { createClient } from "@/lib/supabase/client";
import { Session, SessionContextProvider as SupabaseSessionContextProvider } from "@supabase/auth-ui-react";
import React, { useState } from "react";

interface SessionContextProviderProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

export function SessionContextProvider({ children, initialSession }: SessionContextProviderProps) {
  const [supabaseClient] = useState(() => createClient());

  return (
    <SupabaseSessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={initialSession}
    >
      {children}
    </SupabaseSessionContextProvider>
  );
}