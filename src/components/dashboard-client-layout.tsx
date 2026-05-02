"use client";

import { usePathname } from 'next/navigation';
import React from 'react';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  onSignOut: () => void;
}

export function DashboardClientLayout({ 
  children, 
  onSignOut 
}: DashboardClientLayoutProps) {
  const pathname = usePathname();
  
  // Note: Route protection is handled server-side in layout.tsx
  // This component handles the UI shell
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ReinPlaner</h1>
              <span className="ml-2 text-sm text-gray-500">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onSignOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}