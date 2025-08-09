"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Bot } from "lucide-react";

export function TriggerAutoTimeEntryButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleTrigger = async () => {
    setLoading(true);
    toast.info("Starte die automatische Erstellung von Zeiteinträgen (v2)...");

    const { data, error } = await supabase.functions.invoke('create-scheduled-time-entries-v2');

    if (error) {
      toast.error(`Fehler beim Aufrufen der Funktion: ${error.message}`);
    } else {
      if (data.success) {
        toast.success(data.message);
        if (data.createdCount === 0) {
            toast.info("Keine neuen Einträge erstellt. Details in der Browser-Konsole (F12).", {
                description: "Mögliche Gründe: Einträge existieren bereits oder es gibt keine passenden Aufträge.",
            });
        }
        console.log("--- Server-Protokoll der automatischen Zeiterstellung (v2) ---");
        console.log(data.logs.join('\n'));
        console.log("---------------------------------------------------------");
      } else {
        toast.error(data.message || "Ein unbekannter Fehler in der Funktion ist aufgetreten.");
        console.error("--- Fehler-Protokoll der automatischen Zeiterstellung (v2) ---");
        console.error(data.logs.join('\n'));
        console.error("-----------------------------------------------------------");
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