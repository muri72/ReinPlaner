"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startImpersonation, listImpersonationTargets } from "@/lib/actions/impersonation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMPERSONATION_STORAGE_KEY, ImpersonationMeta } from "../lib/impersonation/constants";

interface ImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TargetUser {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
}

export function ImpersonationDialog({ open, onOpenChange }: ImpersonationDialogProps) {
  const [targets, setTargets] = useState<TargetUser[]>([]);
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    setIsLoadingTargets(true);
    startTransition(async () => {
      const response = await listImpersonationTargets();
      if (!response.success || !response.data) {
        toast.error(response.message || "Benutzer konnten nicht geladen werden.");
        setIsLoadingTargets(false);
        return;
      }

      setTargets(response.data.targets);
      setAdminName(response.data.admin.fullName);
      setIsLoadingTargets(false);
    });

    return () => {
      setTargets([]);
      setSelectedUserId(null);
      setSearchTerm("");
    };
  }, [open]);

  const filteredTargets = useMemo(() => {
    if (!searchTerm) return targets;
    const lower = searchTerm.toLowerCase();
    return targets.filter(target =>
      target.fullName.toLowerCase().includes(lower) ||
      target.email?.toLowerCase().includes(lower) ||
      target.role.toLowerCase().includes(lower)
    );
  }, [targets, searchTerm]);

  const selectedTarget = selectedUserId ? filteredTargets.find(target => target.id === selectedUserId) : null;

  const handleImpersonation = async () => {
    if (!selectedUserId) {
      toast.info("Bitte wählen Sie einen Nutzer aus.");
      return;
    }

    setIsSubmitting(true);

    const result = await startImpersonation(selectedUserId);

    if (!result.success || !result.data) {
      toast.error(result.message || "Impersonation fehlgeschlagen.");
      setIsSubmitting(false);
      return;
    }

    const session = result.data.session;

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (setSessionError) {
      toast.error(setSessionError.message || "Sitzung konnte nicht aktualisiert werden.");
      setIsSubmitting(false);
      return;
    }

    const meta: ImpersonationMeta = {
      sessionId: result.data.impersonationSessionId,
      adminUserId: result.data.admin.id,
      adminName: result.data.admin.fullName,
      adminEmail: result.data.admin.email,
      impersonatedUserId: result.data.impersonated.id,
      impersonatedName: result.data.impersonated.fullName,
      impersonatedRole: result.data.impersonated.role,
      startedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(meta));
    }

    toast.success(result.message || "Impersonation gestartet.");
    onOpenChange(false);
    setIsSubmitting(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Als anderer Benutzer anmelden</DialogTitle>
          <DialogDescription>
            Wählen Sie einen existierenden Account aus, um ihn als Administrator zu impersonieren. Ihre eigene Sitzung wird automatisch gesichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Namen, E-Mail oder Rolle suchen..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="rounded-md border bg-muted/40">
            {isLoadingTargets || isPending ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lade Benutzer...
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Keine Benutzer gefunden. Versuchen Sie einen anderen Suchbegriff.
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {filteredTargets.map(target => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedUserId(target.id)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left transition-colors",
                        "hover:bg-muted",
                        selectedUserId === target.id ? "bg-primary/10 text-primary" : "bg-background"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{target.fullName}</span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {target.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {target.email ?? "Keine E-Mail hinterlegt"}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {selectedTarget && (
            <div className="rounded-md border bg-background px-4 py-3">
              <p className="text-sm font-medium">Ausgewählter Account</p>
              <p className="text-sm text-muted-foreground">
                {selectedTarget.fullName} ({selectedTarget.email ?? "Keine E-Mail"}) – Rolle: {selectedTarget.role}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleImpersonation}
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Impersonation starten
          </Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground">
          Hinweis: Ihre ursprüngliche Admin-Sitzung wird gespeichert. Sie können jederzeit über den Banner im Dashboard zu {adminName} zurückkehren.
        </p>
      </DialogContent>
    </Dialog>
  );
}