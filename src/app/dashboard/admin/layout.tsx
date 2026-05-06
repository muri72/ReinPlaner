import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/services-rbac';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentUserRole();
  
  // Only platform_admin can access /dashboard/admin/* routes
  if (role !== 'platform_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-6">
      {children}
    </div>
  );
}
