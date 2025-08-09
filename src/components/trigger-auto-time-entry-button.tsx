"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TriggerAutoTimeEntryButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleTrigger = async () => {
    setLoading(true);
    toast.info("Starte die automatische Erstellung von Zeiteinträgen...");

    try {
      const { data, error } = await supabase.functions.invoke('create-entries-from-schedule', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(data.message);
        if (data.logs) {
          console.log("Edge Function Logs:", data.logs);
        }
      } else {
        toast.error(data.message || "Ein unbekannter Fehler in der Edge Function ist aufgetreten.");
        if (data.logs) {
          console.error("Edge Function Error Logs:", data.logs);
        }
      }
    } catch (error) {
      console.error("Fehler beim Aufrufen der Edge Function:", error);
      if (error instanceof Error) {
        toast.error(`Fehler beim Aufrufen der Funktion: ${error.message}`);
      } else {
        toast.error("Ein unbekannter Fehler ist aufgetreten.");
      }
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