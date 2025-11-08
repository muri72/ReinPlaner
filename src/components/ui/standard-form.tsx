import React from 'react'
import { cn } from '@/lib/utils'

interface StandardFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * Form layout variant
   * simple: Single column, max-width constrained
   * grid: Two-column grid on desktop, stacked on mobile
   * full: Full width without constraints
   */
  variant?: 'simple' | 'grid' | 'full'
  /**
   * Amount of spacing between form elements
   */
  spacing?: 'compact' | 'standard' | 'loose'
  /**
   * Custom spacing value (overrides spacing prop)
   */
  customSpacing?: string
  children: React.ReactNode
}

const spacingMap = {
  compact: 'space-y-2',
  standard: 'space-y-4',
  loose: 'space-y-6',
}

const widthMap = {
  simple: 'w-full max-w-md mx-auto',
  grid: 'w-full',
  full: 'w-full',
}

export function StandardForm({
  variant = 'simple',
  spacing = 'standard',
  customSpacing,
  className,
  children,
  ...props
}: StandardFormProps) {
  const spacingClass = customSpacing || spacingMap[spacing]
  const widthClass = widthMap[variant]

  return (
    <form
      className={cn(spacingClass, widthClass, className)}
      {...props}
    >
      {children}
    </form>
  )
}

export default StandardForm
