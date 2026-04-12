'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Invoice } from '@/lib/invoicing/types';
import { formatCurrency } from '@/lib/invoicing/invoice-service';
import { format, parseISO, isPast } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Send,
  Download,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import {
  deleteInvoiceAction,
  updateInvoiceStatusAction,
  exportDATEVAction,
  exportZUGFeRDAction,
} from '@/lib/invoicing/actions';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG = {
  draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Versendet', color: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'Bezahlt', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partial: { label: 'Teilweise', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  overdue: { label: 'Überfällig', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Storniert', color: 'bg-gray-100 text-gray-500', icon: XCircle },
  void: { label: 'Ungültig', color: 'bg-gray-100 text-gray-400', icon: XCircle },
};

interface InvoiceListClientProps {
  invoices: Invoice[];
}

export function InvoiceListClient({ invoices }: InvoiceListClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      searchTerm === '' ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.debtor?.billing_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.reference_text?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Möchten Sie diese Rechnung wirklich löschen?')) return;

    setDeletingId(invoiceId);
    try {
      await deleteInvoiceAction(invoiceId);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (invoiceId: string, status: string) => {
    await updateInvoiceStatusAction(invoiceId, status as any);
    router.refresh();
  };

  const handleExportDATEV = async () => {
    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    const result = await exportDATEVAction(startOfYear, now.toISOString().split('T')[0]);
    if (result.success && result.data) {
      downloadBuffer(result.data, result.filename || 'DATEV_Export.csv');
    }
  };

  const handleExportZUGFeRD = async (invoiceId: string) => {
    const result = await exportZUGFeRDAction(invoiceId);
    if (result.success && result.data) {
      downloadBuffer(result.data, result.filename || 'invoice.xml');
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechnungsnummer, Debitor, Referenz suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="sent">Versendet</option>
          <option value="paid">Bezahlt</option>
          <option value="partial">Teilweise bezahlt</option>
          <option value="overdue">Überfällig</option>
          <option value="cancelled">Storniert</option>
        </select>
      </div>

      {/* Table */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Rechnungen gefunden</p>
          <p className="text-sm">
            {searchTerm || statusFilter !== 'all'
              ? 'Versuchen Sie einen anderen Filter.'
              : 'Erstellen Sie Ihre erste Rechnung.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rechnungsnr.</TableHead>
                <TableHead>Debitor</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Fällig</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(invoice => (
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.debtor?.billing_name || '—'}
                  </TableCell>
                  <TableCell>
                    {invoice.issue_date
                      ? format(parseISO(invoice.issue_date), 'dd.MM.yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        invoice.status === 'overdue'
                          ? 'text-red-600 font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {invoice.due_date
                        ? format(parseISO(invoice.due_date), 'dd.MM.yyyy')
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total_amount_cents, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Anzeigen
                          </Link>
                        </DropdownMenuItem>

                        {invoice.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(invoice.id, 'sent')}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Als versendet markieren
                          </DropdownMenuItem>
                        )}

                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(invoice.id, 'paid')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Als bezahlt markieren
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => handleExportZUGFeRD(invoice.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          ZUGFeRD Export
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {invoice.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(invoice.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filteredInvoices.length} von {invoices.length} Rechnungen angezeigt
      </p>
    </div>
  );
}
