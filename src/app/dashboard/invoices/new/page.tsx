import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDebtorsAction, getInvoicesAction } from '@/lib/invoicing/actions';
import { NewInvoiceForm } from '@/components/new-invoice-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NewInvoicePage() {
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

  const [debtorsResult, ordersResult] = await Promise.all([
    getDebtorsAction(),
    getInvoicesAction({ status: ['draft'] }),
  ]);

  // Fetch available orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, title, customer_id, order_type, fixed_monthly_price, objects(customer_id, customers(name))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const processedOrders = (orders || []).map((o: any) => ({
    ...o,
    customer_name: o.objects?.customers?.name || 'Unbekannt',
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Neue Rechnung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erstellen Sie eine neue Rechnung manuell oder aus einem Auftrag.
          </p>
        </div>
      </div>

      <NewInvoiceForm
        debtors={debtorsResult.data || []}
        orders={processedOrders}
      />
    </div>
  );
}
