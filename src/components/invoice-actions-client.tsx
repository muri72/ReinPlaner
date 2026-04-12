'use client';

interface InvoiceActionsClientProps {
  invoiceId: string;
  invoiceStatus: string;
}

export function InvoiceActionsClient({ invoiceId, invoiceStatus }: InvoiceActionsClientProps) {
  return (
    <div className="flex gap-2">
      <p>Actions - Coming Soon</p>
    </div>
  );
}
