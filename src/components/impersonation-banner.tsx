"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getActiveImpersonation, stopImpersonation } from "@/lib/actions/impersonation";
import { toast } from "sonner";

interface ImpersonationSession {
  id: string;
  impersonated_profile: {
    first_name: string;
    last_name: string;
    role: string;
  };
  admin_profile: {
    first_name: string;
    last_name: string;
  };
  started_at: string;
}

export function ImpersonationBanner() {
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await getActiveImpersonation();
        setSession(sessionData);
      } catch (error) {
        console.error("Error fetching impersonation session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const handleStopImpersonation = async () => {
    try {
      const result = await stopImpersonation();
      if (result.success) {
        toast.success("Impersonation beendet");
        window.location.reload(); // Reload to clear any cached data
      } else {
        toast.error(result.message || "Fehler beim Beenden der Impersonation");
      }
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      toast.error("Fehler beim Beenden der Impersonation");
    }
  };

  if (loading || !session) {
    return null;
  }

  return (
    <Alert className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="font-semibold">Impersonation aktiv:</span>{" "}
          Sie agieren als{" "}
          <span className="font-semibold">
            {session.impersonated_profile.first_name} {session.impersonated_profile.last_name}
          </span>{" "}
          ({session.impersonated_profile.role}){" "}
          <span className="text-sm text-orange-600 dark:text-orange-300">
            (Gestartet von {session.admin_profile.first_name} {session.admin_profile.last_name})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopImpersonation}
          className="ml-4 border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-800"
        >
          <X className="h-4 w-4 mr-1" />
          Beenden
        </Button>
      </AlertDescription>
    </Alert>
  );
}