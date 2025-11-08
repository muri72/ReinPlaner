import React from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormSubmissionStateProps {
  isLoading: boolean
  isSuccess?: boolean
  isError?: boolean
  loadingText?: string
  successText?: string
  errorText?: string
  className?: string
}

/**
 * Standardized form submission state component
 * Provides consistent loading, success, and error states across all forms
 */
export function FormSubmissionState({
  isLoading,
  isSuccess = false,
  isError = false,
  loadingText = 'Wird gespeichert...',
  successText = 'Erfolgreich gespeichert!',
  errorText = 'Ein Fehler ist aufgetreten',
  className,
}: FormSubmissionStateProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
        <CheckCircle2 className="h-4 w-4" />
        <span>{successText}</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-red-600', className)}>
        <XCircle className="h-4 w-4" />
        <span>{errorText}</span>
      </div>
    )
  }

  return null
}

export default FormSubmissionState
