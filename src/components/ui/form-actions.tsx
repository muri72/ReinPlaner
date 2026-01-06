"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSubmissionState } from '@/components/ui/form-submission-state';

interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  submitVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  submitClassName?: string;
  cancelClassName?: string;
  className?: string;
  isSuccess?: boolean;
  isError?: boolean;
  successText?: string;
  errorText?: string;
  loadingText?: string;
  align?: 'left' | 'center' | 'right';
}

export function FormActions({
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Speichern",
  cancelLabel = "Abbrechen",
  showCancel = true,
  submitVariant = "default",
  submitClassName,
  cancelClassName,
  className,
  isSuccess = false,
  isError = false,
  successText,
  errorText,
  loadingText,
  align = 'right',
}: FormActionsProps) {
  const alignMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Submission State Feedback */}
      <FormSubmissionState
        isLoading={isSubmitting}
        isSuccess={isSuccess}
        isError={isError}
        loadingText={loadingText}
        successText={successText}
        errorText={errorText}
        className={cn(
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
          align === 'left' && 'text-left'
        )}
      />

      {/* Action Buttons */}
      <div className={cn("flex gap-2", alignMap[align])}>
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cn(cancelClassName)}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="button"
          variant={submitVariant}
          disabled={isSubmitting}
          className={cn(submitClassName)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmit?.();
          }}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Wird gespeichert..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
