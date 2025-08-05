import React from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Here we will add the Header and Sidebar later */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}