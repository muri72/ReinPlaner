import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getInvoicesAction } from '@/lib/invoicing/actions';
import { INVOICE_STATUS_LABELS } from '@/lib/invoicing/invoice-service';
import { formatCurrency } from '@/lib/invoicing/invoice-service';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Send,
  Download,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { InvoiceListClient } from '@/components/invoice-list-client';

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    redirect('/dashboard');
  }

  const { success, data: invoices } = await getInvoicesAction({});

  const stats = {
    total: invoices?.length || 0,
    draft: invoices?.filter(i => i.status === 'draft').length || 0,
    sent: invoices?.filter(i => i.status === 'sent').length || 0,
    paid: invoices?.filter(i => i.status === 'paid').length || 0,
    overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rechnungen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alle Rechnungen im Überblick
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/finances">
              <Download className="mr-2 h-4 w-4" />
              DATEV Export
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Neue Rechnung
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Entwürfe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Versendet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alle Rechnungen</CardTitle>
          <CardDescription className="text-sm">
            Klicken Sie auf eine Rechnung, um Details anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceListClient invoices={invoices || []} />
        </CardContent>
      </Card>
    </div>
  );
}
