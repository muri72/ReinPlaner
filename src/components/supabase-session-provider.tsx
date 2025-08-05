"use client";

import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js"; // Korrigierter Import für den Session-Typ
import React, { useState } from "react";

interface SessionContextProviderProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

export function SessionContextProvider({ children, initialSession }: SessionContextProviderProps) {
  const [supabaseClient] = useState(() => createClient());

  return (
    // Dieser benutzerdefinierte SessionContextProvider umschließt die Anwendung
    // und stellt den Supabase-Client bereit. Er importiert keinen SessionContextProvider
    // von @supabase/auth-ui-react, da dieser dort nicht existiert.
    // Die Auth-UI-Komponente wird direkt auf der Login-Seite verwendet.
    <>
      {children}
    </>
  );
}