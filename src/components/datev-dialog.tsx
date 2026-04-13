'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/date-range-picker';
import { exportDATEVAction } from '@/lib/invoicing/actions';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DATEVDialogProps {
  children?: React.ReactNode;
}

export function DATEVDialog({ children }: DATEVDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1), // Start of year
    to: new Date(),
  });

  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Bitte wählen Sie einen Zeitraum aus.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');
      const result = await exportDATEVAction(dateFrom, dateTo);

      if (result.success && result.data) {
        const blob = new Blob([new Uint8Array(result.data)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'DATEV_Export.csv';
        a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
      } else {
        setError(result.message || 'Export fehlgeschlagen.');
      }
    } catch (err: any) {
      setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>DATEV Export</DialogTitle>
          <DialogDescription>
            Exportieren Sie Ihre Rechnungen im DATEV-Format (CSV) für die Übergabe an Ihren Steuerberater.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Zeitraum</Label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Enthaltene Daten:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Rechnungen mit Status: Bezahlt, Versendet, Teilweise</li>
              <li>Leistungsdatum, Beträge, Steuersatz</li>
              <li>Debitorenkonto und Sachkonto</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={loading || !dateRange.from || !dateRange.to}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportiere...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
