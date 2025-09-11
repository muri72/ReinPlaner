"use client";

import React from 'react';

interface DataTableToolbarProps {
  children: React.ReactNode;
}

export function DataTableToolbar({ children }: DataTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        {children}
      </div>
    </div>
  );
}