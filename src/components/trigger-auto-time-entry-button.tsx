"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TriggerAutoTimeEntryButton() {
  const [loading, setLoading] = useState(false);
  const [logData, setLogData] = useState<string[] | null>(null);
  const [dialogTitle, setDialogTitle] = useState("");
  const supabase = createClient();

  const handleTrigger = async () => {
    setLoading(true);
    setLogData(null);
    toast.info("Starte die automatische Erstellung von Zeiteinträgen...");

    try {
      const { data, error } = await supabase.functions.invoke('create-entries-from-schedule', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      setDialogTitle(data.message || "Funktionsergebnis");
      if (data.logs) {
        setLogData(data.logs);
      }

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Ein unbekannter Fehler in der Edge Function ist aufgetreten.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
      toast.error(`Fehler beim Aufrufen der Funktion: ${errorMessage}`);
      setDialogTitle("Fehler beim Funktionsaufruf");
      setLogData([errorMessage]);
    }

    setLoading(false);
  };

  return (
    <>
      <Button onClick={handleTrigger} disabled={loading}>
        <Bot className="mr-2 h-4 w-4" />
        {loading ? "Zeiteinträge werden erstellt..." : "Automatische Zeiteinträge jetzt erstellen"}
      </Button>

      <AlertDialog open={!!logData} onOpenChange={() => setLogData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <pre className="mt-2 w-full max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-white font-mono text-xs">
                <code>
                  {logData?.join('\n')}
                </code>
              </pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLogData(null)}>Schließen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}