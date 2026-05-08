import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InvoicesClientPage } from './invoices-client-page';

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

  return <InvoicesClientPage />;
}
