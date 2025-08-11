"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GradientDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function GradientDivider({ direction = 'horizontal', className, ...props }: GradientDividerProps) {
  return (
    <div
      className={cn(
        'relative',
        direction === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        'bg-gradient-to-r from-transparent via-primary/30 to-transparent dark:via-primary/50', // Subtle gradient
        className
      )}
      {...props}
    />
  );
}