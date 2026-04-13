'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem } from '@/lib/invoicing/types';
import { formatCurrency } from '@/lib/invoicing/formatters';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Send,
  CheckCircle,
  Loader2,
  FileText,
  AlertCircle,
  Plus,
  Euro,
  Calendar,
} from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import {
  downloadInvoicePDFAction,
  sendInvoiceEmailAction,
  updateInvoiceStatusAction,
  recordPaymentAction,
} from '@/lib/invoicing/actions';
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

interface InvoiceDetailClientProps {
  invoice: Invoice;
  items: InvoiceItem[];
}

export function InvoiceDetailClient({ invoice, items }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setMessage(null);
    try {
      const result = await downloadInvoicePDFAction(invoice.id);
      if (result.success && result.data) {
        downloadBuffer(result.data, result.filename || `Rechnung_${invoice.invoice_number}.pdf`);
        setMessage({ type: 'success', text: 'PDF wurde heruntergeladen.' });
      } else {
        setMessage({ type: 'error', text: result.message || 'PDF konnte nicht generiert werden.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setMessage(null);
    try {
      const result = await sendInvoiceEmailAction(invoice.id);
      if (result.success) {
        setMessage({ type: 'success', text: 'Rechnung wurde erfolgreich versendet.' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.message || 'Fehler beim Versenden.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsPaid = async () => {
    const amount = paymentAmount
      ? Math.round(parseFloat(paymentAmount.replace(',', '.')) * 100)
      : invoice.total_amount_cents;

    setIsMarkingPaid(true);
    setMessage(null);
    try {
      // Record the payment
      const paymentResult = await recordPaymentAction(invoice.id, {
        amount_cents: amount,
        payment_date: paymentDate,
        payment_method: 'bank_transfer',
      });

      if (!paymentResult.success) {
        setMessage({ type: 'error', text: paymentResult.message || 'Fehler beim Erfassen der Zahlung.' });
        return;
      }

      // Update status to paid
      await updateInvoiceStatusAction(invoice.id, 'paid');
      setMessage({ type: 'success', text: 'Rechnung wurde als bezahlt markiert.' });
      setShowPaymentDialog(false);
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const downloadBuffer = (buffer: Buffer, filename: string) => {
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remainingAmount = invoice.total_amount_cents - (invoice.paid_amount_cents || 0);
  const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'void';

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <div
          className={`px-4 py-3 rounded-md text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* PDF Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          PDF herunterladen
        </Button>

        {/* Send Email */}
        {(invoice.status === 'draft' || invoice.status === 'sent') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Per E-Mail senden
          </Button>
        )}

        {/* Mark as Paid */}
        {canMarkPaid && (
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Als bezahlt markieren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zahlung erfassen</DialogTitle>
                <DialogDescription>
                  Rechnung {invoice.invoice_number} als bezahlt markieren.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Betrag (Cent)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    placeholder={(remainingAmount / 100).toFixed(2)}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Offener Betrag: {formatCurrency(remainingAmount, invoice.currency)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Zahlungsdatum</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isMarkingPaid ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Als bezahlt markieren
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Status Badge */}
        <div className="flex items-center ml-auto">
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Invoice Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rechnungspositionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>Keine Positionen vorhanden.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Beschreibung</th>
                    <th className="text-right p-3 font-medium">Menge</th>
                    <th className="text-right p-3 font-medium">Einzelpreis</th>
                    <th className="text-right p-3 font-medium">Netto</th>
                    <th className="text-right p-3 font-medium">MwSt.</th>
                    <th className="text-right p-3 font-medium">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const grossAmount = item.net_amount_cents + item.tax_amount_cents;
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3">
                          <div>{item.service_description}</div>
                          {item.service_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Leistungsdatum: {format(parseISO(item.service_date), 'dd.MM.yyyy')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(item.unit_price_cents, invoice.currency)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(item.net_amount_cents, invoice.currency)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {item.tax_rate > 0
                            ? `${item.tax_rate}%`
                            : '0%'}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(grossAmount, invoice.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Netto:</span>
                <span>{formatCurrency(invoice.net_amount_cents, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  MwSt. ({invoice.tax_rate}%):
                </span>
                <span>{formatCurrency(invoice.tax_amount_cents, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Gesamtbetrag:</span>
                <span className="text-primary">
                  {formatCurrency(invoice.total_amount_cents, invoice.currency)}
                </span>
              </div>
              {invoice.paid_amount_cents > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Bereits bezahlt:</span>
                  <span>{formatCurrency(invoice.paid_amount_cents, invoice.currency)}</span>
                </div>
              )}
              {remainingAmount > 0 && remainingAmount < invoice.total_amount_cents && (
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Noch offen:</span>
                  <span>{formatCurrency(remainingAmount, invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
