import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DebugPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return (
    <div>
      <h1>Debug Page</h1>
      <p>User: {user ? user.email : 'null'}</p>
      <p>Error: {error ? error.message : 'none'}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}
