"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface FormWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormWrapper({ children, title, description, className }: FormWrapperProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {title && (
          <div className="space-y-1 mb-6">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className={className}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
