"use client";

import React from 'react';
import { useForm, SubmitHandler, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { StandardForm } from '@/components/ui/standard-form';
import { FormSection } from '@/components/ui/form-section';
import { FormActions } from '@/components/ui/form-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface BaseFormProps<T extends z.ZodTypeAny = z.ZodTypeAny> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<{ success: boolean; message: string }>;
  defaultValues?: Partial<z.infer<T>>;
  title?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  variant?: 'simple' | 'grid' | 'full';
  spacing?: 'compact' | 'standard' | 'loose';
  submitButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onSuccess?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  className?: string;
  card?: boolean;
  successMessage?: string;
}

export function UnifiedForm<T extends z.ZodTypeAny>({
  schema,
  onSubmit,
  defaultValues,
  title,
  description,
  submitLabel = "Speichern",
  cancelLabel = "Abbrechen",
  showCancel = true,
  variant = 'simple',
  spacing = 'standard',
  submitButtonVariant = "default",
  onSuccess,
  onCancel,
  children,
  className,
  card = true,
  successMessage = "Erfolgreich gespeichert!",
}: BaseFormProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const handleSubmit: SubmitHandler<z.infer<T>> = async (data) => {
    setIsSubmitting(true);
    setIsSuccess(false);
    setIsError(false);

    try {
      const result = await onSubmit(data);

      if (result.success) {
        setIsSuccess(true);
        toast.success(successMessage);
        onSuccess?.();
      } else {
        setIsError(true);
        toast.error(result.message || "Ein Fehler ist aufgetreten");
      }
    } catch (error) {
      setIsError(true);
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper function to call handleSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleSubmit(data);
  };

  const formContent = (
    <StandardForm
      variant={variant}
      spacing={spacing}
      onSubmit={form.handleSubmit(handleSubmit)}
      className={className}
    >
      {title || description ? (
        <div className="space-y-1">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      ) : null}

      <div className="space-y-6">
        {children}
      </div>

      <FormActions
        isSubmitting={isSubmitting}
        isSuccess={isSuccess}
        isError={isError}
        onCancel={() => onCancel?.()}
        onSubmit={handleSubmitClick}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        showCancel={showCancel}
        submitVariant={submitButtonVariant}
        loadingText="Wird gespeichert..."
        successText={successMessage}
        errorText="Fehler beim Speichern"
      />
    </StandardForm>
  );

  if (card) {
    return (
      <Card>
        <CardContent className="pt-6">
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return formContent;
}

// Re-export the individual components for convenience
export { FormSection } from '@/components/ui/form-section';
export { FormActions } from '@/components/ui/form-actions';
