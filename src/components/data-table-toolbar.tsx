"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface DataTableToolbarProps {
  children: React.ReactNode;
}

export function DataTableToolbar({ children }: DataTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
        {children}
      </div>
      <Button variant="outline" className="w-full sm:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" />
        Filter hinzufügen
      </Button>
    </div>
  );
}