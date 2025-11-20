"use client";

import React, { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useDialogUnsavedChanges } from "@/components/ui/unsaved-changes-context";

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "5xl";
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
}: RecordDialogProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const { isDirty } = useDialogUnsavedChanges();

  const handleOpenChange = (nextOpen: boolean) => {
    // If closing and form has unsaved changes, show confirmation
    if (!nextOpen && open && isDirty) {
      setShowConfirmClose(true);
    } else {
      onOpenChange(nextOpen);
    }
  };

  const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-2xl",
    lg: "sm:max-w-3xl",
    xl: "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  };

  // Recursive function to check if a component has DialogTrigger anywhere in its tree
  const hasDialogTriggerInTree = (element: any): boolean => {
    if (!React.isValidElement(element)) return false;

    // Check if this element itself is a DialogTrigger
    if (element.type === DialogTrigger) {
      return true;
    }

    // Check all children recursively
    const elementChildren = (element.props as any)?.children;
    if (elementChildren) {
      return React.Children.toArray(elementChildren).some((child: any) =>
        hasDialogTriggerInTree(child)
      );
    }

    return false;
  };

  // Separate children into trigger and content
  const triggerChildren: ReactNode[] = [];
  const contentChildren: ReactNode[] = [];

  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child)) {
      const hasDialogTrigger = hasDialogTriggerInTree(child);

      if (hasDialogTrigger) {
        triggerChildren.push(child);
      } else {
        contentChildren.push(child);
      }
    } else {
      contentChildren.push(child);
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Render trigger if provided - must be inside Dialog but outside DialogContent */}
        {triggerChildren.length > 0 && triggerChildren}

        <DialogContent
          className={`${sizeClasses[size]} max-h-[95vh] overflow-hidden flex flex-col glassmorphism-card p-0 ${className || ""}`}
        >
          {/* Dialog Header */}
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
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
