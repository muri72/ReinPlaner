'use client';

import { useEffect, useState } from 'react';
import { getInvoiceStatsAction, formatCurrency } from '@/lib/invoicing/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileText, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

export function OpenInvoicesWidget() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getInvoiceStatsAction();
        if (result.success) {
          setStats(result.data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Offene Rechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const openAmount = (stats.total_open || 0);
  const overdueAmount = (stats.total_overdue || 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Offene Rechnungen
          </CardTitle>
          <Link
            href="/dashboard/invoices"
            className="text-xs text-primary hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Überfällig</span>
            <span className="text-xl font-bold text-red-600">
              {stats.total_overdue || 0}
            </span>
          </div>
          {overdueAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              davon {formatCurrency(overdueAmount)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Ausstehend</span>
            <span className="text-xl font-bold">
              {stats.total_open || 0}
            </span>
          </div>
        </div>

        {stats.total_paid_this_month > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                In diesem Monat
              </span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(stats.total_paid_this_month)}
              </span>
            </div>
          </div>
        )}

        {stats.total_draft > 0 && (
          <div className="pt-1">
            <span className="text-xs text-muted-foreground">
              {stats.total_draft} Entwürfe
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
