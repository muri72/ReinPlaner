"use client";

import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode; // For action buttons
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}