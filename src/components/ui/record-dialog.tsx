"use client";

import React, { useState, ReactNode, isValidElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useDialogUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { cn } from "@/lib/utils";

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  hideCloseButton?: boolean;
  onOpenAutoFocus?: (e: Event) => void;
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  className,
  size = "md",
  hideCloseButton = false,
  onOpenAutoFocus,
}: RecordDialogProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const { isDirty } = useDialogUnsavedChanges();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && isDirty) {
      setShowConfirmClose(true);
    } else {
      onOpenChange(nextOpen);
    }
  };

  const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-2xl",
    lg: "sm:max-w-4xl",
    xl: "sm:max-w-6xl",
  };

  // Recursively check if an element or its children contain a DialogTrigger
  const hasDialogTrigger = (element: ReactNode): boolean => {
    if (!isValidElement(element)) return false;
    if (element.type === DialogTrigger) return true;
    const elementChildren = (element.props as any)?.children;
    if (elementChildren) {
      return React.Children.toArray(elementChildren).some(hasDialogTrigger);
    }
    return false;
  };

  // Split children into trigger elements and content
  const triggerChildren: ReactNode[] = [];
  const contentChildren: ReactNode[] = [];

  React.Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && hasDialogTrigger(child)) {
      triggerChildren.push(child);
    } else {
      contentChildren.push(child);
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Render DialogTrigger as sibling to DialogContent (required by Radix) */}
        {triggerChildren.length > 0 && triggerChildren}

        <DialogContent
          className={cn(
            "max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col p-0",
            sizeClasses[size],
            className
          )}
          hideCloseButton={hideCloseButton}
          onOpenAutoFocus={onOpenAutoFocus}
        >
          {/* Dialog Header — fixed, doesn't scroll */}
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Scrollable Content */}
          <div data-dialog-content className="flex-1 overflow-y-auto px-6 py-4">
            {contentChildren}
          </div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesAlert
        open={showConfirmClose}
        onConfirm={() => {
          setShowConfirmClose(false);
          onOpenChange(false);
        }}
        onCancel={() => setShowConfirmClose(false)}
        title="Ungespeicherte Änderungen verwerfen?"
        description="Wenn Sie das Dialog jetzt schließen, gehen Ihre Eingaben verloren."
      />
    </>
  );
}