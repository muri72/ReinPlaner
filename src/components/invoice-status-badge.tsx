import { Badge } from '@/components/ui/badge';
import { InvoiceStatus } from '@/lib/invoicing/types';
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  draft: {
    label: 'Entwurf',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  sent: {
    label: 'Versendet',
    variant: 'default',
    className: 'bg-blue-600 text-white hover:bg-blue-600',
  },
  paid: {
    label: 'Bezahlt',
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-600',
  },
  partial: {
    label: 'Teilweise',
    variant: 'default',
    className: 'bg-yellow-500 text-white hover:bg-yellow-500',
  },
  overdue: {
    label: 'Überfällig',
    variant: 'destructive',
  },
  cancelled: {
    label: 'Storniert',
    variant: 'secondary',
    className: 'bg-gray-200 text-gray-500 hover:bg-gray-200',
  },
  void: {
    label: 'Ungültig',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-400 hover:bg-gray-100',
  },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
