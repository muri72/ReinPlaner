"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { FormGrid } from '@/components/ui/grid-layouts';

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  grid?: boolean;
  cols?: '1' | '2' | '3' | '4';
  icon?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className,
  grid = false,
  cols = '2',
  icon,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              <h3 className="text-lg font-semibold tracking-tight">
                {title}
              </h3>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {grid ? (
        <FormGrid cols={cols} className="mt-4">
          {children}
        </FormGrid>
      ) : (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
