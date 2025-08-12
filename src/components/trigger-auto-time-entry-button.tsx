"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { triggerAutomaticTimeEntryCreation } from "@/app/dashboard/time-tracking/actions";
import { handleActionResponse } from "@/lib/toast-utils"; // Importiere die neue Utility

export function TriggerAutoTimeEntryButton() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    toast.info("Starte die automatische Erstellung von Zeiteinträgen..."); // Dies ist eine Info-Nachricht, keine Erfolgs-/Fehlermeldung

    const result = await triggerAutomaticTimeEntryCreation();

    handleActionResponse(result); // Nutze die neue Utility

    setLoading(false);
  };

  return (
    <Button onClick={handleTrigger} disabled={loading}>
      <Bot className="mr-2 h-4 w-4" />
      {loading ? "Zeiteinträge werden erstellt..." : "Automatische Zeiteinträge jetzt erstellen"}
    </Button>
  );
}