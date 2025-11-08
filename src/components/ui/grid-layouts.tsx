import React from 'react'
import { cn } from '@/lib/utils'

// Common grid layout configurations for forms
export const gridConfigs = {
  // Two columns: stacked on mobile, 2 columns on desktop
  twoCol: 'grid grid-cols-1 md:grid-cols-2 gap-4',

  // Three columns: stacked on mobile, 3 columns on desktop
  threeCol: 'grid grid-cols-1 md:grid-cols-3 gap-4',

  // Four columns: stacked on mobile, 4 columns on desktop
  fourCol: 'grid grid-cols-1 md:grid-cols-4 gap-4',

  // Image gallery: 3 columns on mobile, 5 on tablet/desktop
  imageGallery: 'grid grid-cols-3 sm:grid-cols-5 gap-2',

  // Complex schedule grid for employee schedules
  scheduleGrid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4',

  // Two column compact (smaller gap)
  twoColCompact: 'grid grid-cols-1 md:grid-cols-2 gap-2',
}

interface FormGridProps {
  children: React.ReactNode
  config?: keyof typeof gridConfigs
  className?: string
  cols?: '1' | '2' | '3' | '4' | 'auto'
  responsive?: boolean
}

export function FormGrid({
  children,
  config,
  className,
  cols = '1',
  responsive = true,
}: FormGridProps) {
  if (config) {
    return <div className={cn(gridConfigs[config], className)}>{children}</div>
  }

  if (responsive) {
    const responsiveClass = {
      '1': 'grid grid-cols-1',
      '2': 'grid grid-cols-1 md:grid-cols-2',
      '3': 'grid grid-cols-1 md:grid-cols-3',
      '4': 'grid grid-cols-1 md:grid-cols-4',
      'auto': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    }[cols]

    return <div className={cn(responsiveClass, 'gap-4', className)}>{children}</div>
  }

  return <div className={cn(`grid grid-cols-${cols}`, 'gap-4', className)}>{children}</div>
}

export default FormGrid
