"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode; // For action buttons
  loading?: boolean; // Add loading prop
}

export function PageHeader({ title, children, loading }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}