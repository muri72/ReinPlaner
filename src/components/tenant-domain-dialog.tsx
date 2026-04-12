'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addTenantDomain, getDomainVerificationInstructions, verifyDomainOwnership } from '@/lib/actions/tenant-admin';
import { toast } from 'sonner';

interface TenantDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function TenantDomainDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: TenantDomainDialogProps) {
  const [step, setStep] = useState<'add' | 'verify' | 'success'>('add');
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState('');
  const [verificationData, setVerificationData] = useState<{
    token: string;
    instructions: string[];
  } | null>(null);
  const [domainId, setDomainId] = useState<string | null>(null);

  const handleAddDomain = async () => {
    if (!domain) return;
    setLoading(true);

    try {
      const result = await addTenantDomain(tenantId, domain);
      if (result.error) {
        toast.error(`Fehler: ${result.error}`);
      } else if (result.data) {
        // Get verification instructions
        const detailsResult = await getDomainVerificationInstructions(domain);
        if (detailsResult.data) {
          setVerificationData({
            token: detailsResult.data.token,
            instructions: detailsResult.data.instructions,
          });
        } else {
          setVerificationData({
            token: result.data.verification_token,
            instructions: [
              `1. Log in to your DNS provider for ${domain}`,
              `2. Create a new TXT record`,
              `3. Set the name/host to: _reinplaner-verification.${domain.replace(/^www\./, '')}`,
              `4. Set the value to: ${result.data.verification_token}`,
              `5. Save the record and wait 5-10 minutes for DNS propagation`,
              `6. Click "Verify" to confirm`,
            ],
          });
        }

        toast.success(`Domain "${domain}" hinzugefügt. Bitte DNS-Eintrag erstellen.`);
        setStep('verify');
      }
    } catch (err) {
      toast.error(`Fehler: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!domainId) return;
    setLoading(true);

    try {
      const result = await verifyDomainOwnership(domainId);
      if (result.error) {
        toast.error(`Fehler: ${result.error}`);
      } else {
        toast.success(`Domain "${domain}" erfolgreich verifiziert!`);
        setStep('success');
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 2000);
      }
    } catch (err) {
      toast.error(`Fehler: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('add');
    setDomain('');
    setVerificationData(null);
    setDomainId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'add' && `Custom Domain für ${tenantName}`}
            {step === 'verify' && 'Domain verifizieren'}
            {step === 'success' && '✅ Domain verifiziert!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'add' && 'Füge eine eigene Domain für diesen Tenant hinzu.'}
            {step === 'verify' && 'Folge den Anweisungen, um die Domain zu verifizieren.'}
            {step === 'success' && 'Die Domain wurde erfolgreich verifiziert.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Add Domain */}
        {step === 'add' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="z.B. www.musterfirma.de"
                type="text"
              />
              <p className="text-xs text-muted-foreground">
                Gib die Domain ohne Protokoll ein (http/https wird automatisch erkannt).
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Verification Instructions */}
        {step === 'verify' && verificationData && (
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">DNS TXT-Record erstellen</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {verificationData.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">Dein Verification Token:</h4>
              <code className="text-xs break-all bg-muted px-2 py-1 rounded">
                {verificationData.token}
              </code>
            </div>

            <p className="text-sm text-muted-foreground">
              ⚠️ Die DNS-Änderung kann bis zu 24 Stunden dauern, meist jedoch nur 5-10 Minuten.
            </p>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="grid gap-4 py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium">Domain erfolgreich verifiziert!</h3>
              <p className="text-muted-foreground mt-1">
                {domain} ist jetzt für {tenantName} aktiviert.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'add' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAddDomain} disabled={!domain || loading}>
                {loading ? 'Wird hinzugefügt...' : 'Domain hinzufügen'}
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <Button variant="outline" onClick={() => setStep('add')}>
                Zurück
              </Button>
              <Button onClick={handleVerify} disabled={loading}>
                {loading ? 'Verifiziere...' : 'Jetzt verifizieren'}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={() => {
              onOpenChange(false);
              resetForm();
            }}>
              Schließen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
