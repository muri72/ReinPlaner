'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StopCircle, AlertTriangle, Shield, Clock } from 'lucide-react';
import { stopImpersonation } from '@/lib/actions/impersonation';
import { createClient } from '@/lib/supabase/client';

export function ImpersonationBanner() {
  const [isStopping, setIsStopping] = useState(false);
  const [impersonationData, setImpersonationData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkImpersonationStatus = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUser(session.user);
        const data = session.user.user_metadata?.impersonationData;
        setImpersonationData(data);
      }
    };

    checkImpersonationStatus();
  }, []);

  if (!impersonationData) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      setIsStopping(true);
      await stopImpersonation();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    } finally {
      setIsStopping(false);
    }
  };

  const startTime = new Date(impersonationData.startedAt);
  const duration = Date.now() - startTime.getTime();
  const durationMinutes = Math.floor(duration / 60000);

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-6">
      <Shield className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        Admin Impersonation Modus Aktiv
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="flex items-center gap-2 text-orange-700">
          <span>Sie agieren als:</span>
          <Badge variant="secondary" className="bg-orange-200 text-orange-800">
            {impersonationData.targetRole}
          </Badge>
          <span className="text-sm">
            ({currentUser?.user_metadata?.first_name} {currentUser?.user_metadata?.last_name})
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <Clock className="h-3 w-3" />
          <span>Aktiv seit {durationMinutes} Minute{durationMinutes !== 1 ? 'n' : ''}</span>
        </div>

        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <AlertTriangle className="h-3 w-3" />
          <span>Alle Aktionen werden protokolliert</span>
        </div>

        <Button
          onClick={handleStopImpersonation}
          disabled={isStopping}
          variant="outline"
          size="sm"
          className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          <StopCircle className="h-4 w-4 mr-2" />
          {isStopping ? 'Beende...' : 'Impersonation beenden'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}