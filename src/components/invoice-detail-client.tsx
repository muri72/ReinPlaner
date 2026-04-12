'use client';

interface InvoiceDetailClientProps {
  invoice: any;
  items: any[];
  payments: any[];
}

export function InvoiceDetailClient({ invoice, items, payments }: InvoiceDetailClientProps) {
  return (
    <div className="space-y-4">
      <p>Invoice Detail Component - Coming Soon</p>
    </div>
  );
}
