import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getInvoiceByIdAction } from '@/lib/invoicing/actions';
import { formatCurrency } from '@/lib/invoicing/formatters';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Euro,
  Building2,
  Calendar,
  Mail,
} from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { InvoiceDetailClient } from '@/components/invoice-detail-client';
import { Invoice, InvoiceItem } from '@/lib/invoicing/types';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { success, data: invoice } = await getInvoiceByIdAction(id);

  if (!success || !invoice) {
    notFound();
  }

  const debtor = invoice.debtor;
  const items = invoice.items || [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Rechnung {invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Erstellt am {invoice.issue_date ? format(parseISO(invoice.issue_date), 'dd. MMMM yyyy', { locale: require('date-fns/locale/de') }) : '—'}
            </p>
          </div>
        </div>

      </div>

      {/* Interactive Invoice Card with Actions */}
      <InvoiceDetailClient invoice={invoice as Invoice} items={items as InvoiceItem[]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anmerkungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Debtor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Rechnungsempfänger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-medium">{debtor?.billing_name || '—'}</div>
              {debtor?.billing_street && (
                <div className="text-muted-foreground">{debtor.billing_street}</div>
              )}
              {(debtor?.billing_postal_code || debtor?.billing_city) && (
                <div className="text-muted-foreground">
                  {debtor.billing_postal_code} {debtor.billing_city}
                </div>
              )}
              {debtor?.invoice_email && (
                <div className="pt-2">
                  <a
                    href={`mailto:${debtor.invoice_email}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {debtor.invoice_email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Termine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rechnungsdatum:</span>
                <span className="font-medium">
                  {invoice.issue_date ? format(parseISO(invoice.issue_date), 'dd.MM.yyyy') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fällig am:</span>
                <span className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : ''}`}>
                  {invoice.due_date ? format(parseISO(invoice.due_date), 'dd.MM.yyyy') : '—'}
                </span>
              </div>
              {invoice.delivery_date_start && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lieferzeitraum:</span>
                  <span className="font-medium">
                    {format(parseISO(invoice.delivery_date_start), 'dd.MM.')}
                    {invoice.delivery_date_end && ` – ${format(parseISO(invoice.delivery_date_end), 'dd.MM.yyyy')}`}
                  </span>
                </div>
              )}
              {invoice.order_reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ihre Referenz:</span>
                  <span className="font-medium">{invoice.order_reference}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Zahlung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {debtor?.bank_iban && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IBAN:</span>
                    <span className="font-mono text-xs">{debtor.bank_iban}</span>
                  </div>
                  {debtor?.bank_bic && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BIC:</span>
                      <span className="font-mono text-xs">{debtor.bank_bic}</span>
                    </div>
                  )}
                </>
              )}
              <div className="pt-2 text-xs text-muted-foreground">
                Zahlbar innerhalb von {debtor?.payment_terms_days || 30} Tagen.
                <br />
                Bitte Rechnungsnummer angeben.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
