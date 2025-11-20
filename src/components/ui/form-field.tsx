"use client";

import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface BaseFieldProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
}

interface InputFieldProps<T extends FieldValues = FieldValues>
  extends BaseFieldProps<T> {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'url' | 'time';
  control: Control<T>;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  readonly?: boolean;
}

export function FormInputField<T extends FieldValues = FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  placeholder,
  className,
  labelClassName,
  descriptionClassName,
  type = 'text',
  control,
  error,
  min,
  max,
  step,
  readonly,
}: InputFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-2", className)}>
          <Label
            htmlFor={field.name}
            className={cn(
              "text-sm font-medium",
              required && "after:content-['*'] after:ml-0.5 after:text-destructive",
              labelClassName
            )}
          >
            {label}
          </Label>
          <Input
            {...field}
            id={field.name}
            type={type}
            placeholder={placeholder}
            disabled={disabled || readonly}
            min={min}
            max={max}
            step={step}
            readOnly={readonly}
            className={cn(
              error && "border-destructive focus-visible:ring-destructive",
              readonly && "bg-muted cursor-not-allowed"
            )}
            onChange={(e) => {
              if (type === 'number') {
                field.onChange(e.target.value === '' ? null : Number(e.target.value));
              } else {
                field.onChange(e.target.value);
              }
            }}
            value={
              field.value === null || field.value === undefined
                ? ''
                : field.value
            }
          />
          {description && !error && (
            <p className={cn("text-xs text-muted-foreground", descriptionClassName)}>
              {description}
            </p>
          )}
          {(error || fieldState.error) && (
            <p className="text-xs text-destructive">
              {error || fieldState.error?.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

interface TextareaFieldProps<T extends FieldValues = FieldValues>
  extends BaseFieldProps<T> {
  control: Control<T>;
  error?: string;
  rows?: number;
}

export function FormTextareaField<T extends FieldValues = FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  placeholder,
  className,
  labelClassName,
  descriptionClassName,
  control,
  error,
  rows = 4,
}: TextareaFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-2", className)}>
          <Label
            htmlFor={field.name}
            className={cn(
              "text-sm font-medium",
              required && "after:content-['*'] after:ml-0.5 after:text-destructive",
              labelClassName
            )}
          >
            {label}
          </Label>
          <Textarea
            {...field}
            id={field.name}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn(
              error && "border-destructive focus-visible:ring-destructive",
              "resize-none"
            )}
            value={field.value || ''}
          />
          {description && !error && !fieldState.error && (
            <p className={cn("text-xs text-muted-foreground", descriptionClassName)}>
              {description}
            </p>
          )}
          {(error || fieldState.error) && (
            <p className="text-xs text-destructive">
              {error || fieldState.error?.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
