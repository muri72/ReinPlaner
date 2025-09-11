"use client";

import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode; // For action buttons
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}