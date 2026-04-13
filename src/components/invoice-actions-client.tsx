'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Download,
  Printer,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Edit,
  Loader2,
  FileText,
} from 'lucide-react';
import { sendInvoiceEmailAction, exportZUGFeRDAction, downloadInvoicePDFAction } from '@/lib/invoicing/actions';

interface InvoiceActionsClientProps {
  invoiceId: string;
  invoiceStatus: string;
  onStatusChange?: () => void;
}

export function InvoiceActionsClient({
  invoiceId,
  invoiceStatus,
  onStatusChange,
}: InvoiceActionsClientProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendEmail = async () => {
    setIsSending(true);
    setMessage(null);

    try {
      const result = await sendInvoiceEmailAction(invoiceId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Rechnung wurde erfolgreich versendet.' });
        onStatusChange?.();
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.message || 'Fehler beim Versenden.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setMessage(null);

    try {
      const result = await downloadInvoicePDFAction(invoiceId);
      if (result.success && result.data) {
        downloadBuffer(result.data, result.filename || `Rechnung_${invoiceId}.pdf`);
        setMessage({ type: 'success', text: 'PDF wurde heruntergeladen.' });
      } else {
        setMessage({ type: 'error', text: result.message || 'PDF konnte nicht generiert werden.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportZUGFeRD = async () => {
    setIsDownloading(true);
    setMessage(null);

    try {
      const result = await exportZUGFeRDAction(invoiceId);
      if (result.success && result.data) {
        downloadBuffer(result.data, result.filename || `invoice_${invoiceId}.xml`);
        setMessage({ type: 'success', text: 'ZUGFeRD-Export wurde heruntergeladen.' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Export fehlgeschlagen.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
    } finally {
      setIsDownloading(false);
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
    <div className="flex gap-2 items-center">
      {message && (
        <span
          className={`text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </span>
      )}

      <div className="flex gap-2">
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
          PDF
        </Button>

        {/* Send Email */}
        {(invoiceStatus === 'draft' || invoiceStatus === 'sent') && (
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
            Senden
          </Button>
        )}

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
              <FileText className="mr-2 h-4 w-4" />
              PDF herunterladen
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleExportZUGFeRD} disabled={isDownloading}>
              <Download className="mr-2 h-4 w-4" />
              ZUGFeRD Export
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {(invoiceStatus === 'draft' || invoiceStatus === 'sent') && (
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('Diese Rechnung als Entwurf markieren?')) {
                    // Status change handled via parent
                  }
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Als Entwurf bearbeiten
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
