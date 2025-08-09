"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { triggerAutomaticTimeEntryCreation } from "@/app/dashboard/time-tracking/actions";

export function TriggerAutoTimeEntryButton() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    toast.info("Starte die automatische Erstellung von Zeiteinträgen...");

    const result = await triggerAutomaticTimeEntryCreation();

    if (result.success) {
      toast.success(result.message);
      if (result.createdCount === 0) {
        toast.info("Keine neuen Einträge erstellt.", {
          description: "Mögliche Gründe: Einträge existieren bereits oder es gibt keine passenden Aufträge.",
        });
      }
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <Button onClick={handleTrigger} disabled={loading}>
      <Bot className="mr-2 h-4 w-4" />
      {loading ? "Zeiteinträge werden erstellt..." : "Automatische Zeiteinträge jetzt erstellen"}
    </Button>
  );
}