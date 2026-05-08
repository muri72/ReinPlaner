"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { impersonateTenant } from "@/lib/actions/platform-admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserCircle, AlertTriangle } from "lucide-react";

interface TenantImpersonateModalProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'pending' | 'cancelled';
  };
  trigger?: React.ReactNode;
}

export function TenantImpersonateModal({ tenant, trigger }: TenantImpersonateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    setLoading(true);
    setError(null);

    const result = await impersonateTenant(tenant.id, undefined, reason || undefined);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Close modal and redirect to tenant dashboard
    setOpen(false);
    router.refresh();
    
    // Redirect to tenant dashboard using slug
    window.location.href = `/${tenant.slug}/dashboard`;
  }

  const planLabels = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserCircle className="h-4 w-4 mr-1" />
            Impersonieren
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Tenant impersonieren
          </DialogTitle>
          <DialogDescription>
            Sie sind dabei, die Perspektive dieses Tenants einzunehmen. Diese Aktion wird protokolliert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tenant Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tenant:</span>
              <span className="text-sm">{tenant.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Slug:</span>
              <code className="text-sm bg-muted px-2 py-0.5 rounded">{tenant.slug}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan:</span>
              <span className="text-sm">{planLabels[tenant.plan]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[tenant.status]}`}>
                {tenant.status}
              </span>
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Grund (optional)
            </label>
            <Textarea
              id="reason"
              placeholder="Warum impersonieren Sie diesen Tenant? (z.B. Support-Anfrage, Fehlerbehebung)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Dieser Grund wird in den Audit-Logs gespeichert.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Starten..." : "Impersonation starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
