"use client";

import React, { useEffect, useState } from "react";
import { useFormContext, FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useBeforeUnload } from "./hooks/use-before-unload";

interface UnsavedChangesProps {
  formId?: string;
  showWarning?: boolean;
  warningMessage?: string;
  children: React.ReactNode;
}

/**
 * Modern Unsaved Changes Protection Component
 * Prevents users from accidentally closing forms with unsaved changes
 */
export function UnsavedChangesProtection({
  formId = "default-form",
  showWarning = true,
  warningMessage = "Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?",
  children,
}: UnsavedChangesProps) {
  const formMethods = useFormContext();
  const isDirty = formMethods?.formState?.isDirty;
  const isSubmitting = formMethods?.formState?.isSubmitting;

  // Browser-level warning (beforeunload)
  useBeforeUnload(showWarning && isDirty && !isSubmitting, warningMessage);

  // Navigation warning (next/navigation)
  const router = useRouter();

  useEffect(() => {
    const handleBeforeRouteChange = (url: string) => {
      if (showWarning && isDirty && !isSubmitting) {
        if (!window.confirm(warningMessage)) {
          // Navigation blocked - stay on current page
          throw new Error("Navigation blocked due to unsaved changes");
        }
      }
    };

    // This is a simplified approach - in a real app you'd use a more robust solution
    // like a custom router wrapper or navigation guards
  }, [isDirty, isSubmitting, showWarning, warningMessage]);

  return <>{children}</>;
}

// Modern form wrapper with built-in unsaved changes protection
export function ModernForm({
  id = "default-form",
  onSubmit,
  children,
  showUnsavedWarning = true,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & {
  showUnsavedWarning?: boolean;
}) {
  return (
    <UnsavedChangesProtection formId={id} showWarning={showUnsavedWarning}>
      <form id={id} onSubmit={onSubmit} {...props}>
        {children}
      </form>
    </UnsavedChangesProtection>
  );
}

/**
 * Hook for implementing unsaved changes protection in dialogs
 */
export function useUnsavedChanges(isDirty: boolean, isSubmitting: boolean) {
  const [showDialog, setShowDialog] = React.useState(false);
  const [pendingClose, setPendingClose] = React.useState<(() => void) | null>(null);

  const handleClose = (closeCallback?: () => void) => {
    if (isDirty && !isSubmitting) {
      setPendingClose(() => closeCallback || (() => {}));
      setShowDialog(true);
    } else {
      closeCallback?.();
    }
  };

  const confirmClose = () => {
    setShowDialog(false);
    pendingClose?.();
    setPendingClose(null);
  };

  const cancelClose = () => {
    setShowDialog(false);
    setPendingClose(null);
  };

  return {
    showDialog,
    handleClose,
    confirmClose,
    cancelClose,
  };
}
