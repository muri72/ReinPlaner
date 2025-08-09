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
    toast.info("Starte die automatische Erstellung von Zeiteinträgen. Dies kann einen Moment dauern...");

    const { data, error } = await supabase.functions.invoke('create-scheduled-time-entries');

    if (error) {
      toast.error(`Fehler: ${error.message}`);
    } else {
      toast.success(data.message || "Funktion erfolgreich ausgeführt.");
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