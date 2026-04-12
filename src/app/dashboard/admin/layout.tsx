export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-6">
      {children}
    </div>
  );
}
