"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized Input component
 * Prevents iOS auto-zoom by using minimum 16px font size
 */
const MobileInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-lg border border-input",
        "bg-background px-4 py-3",
        // Mobile-first: 16px prevents iOS zoom, scales down on desktop
        "text-base md:text-sm",
        "ring-offset-background",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Touch-optimized
        "min-h-[44px]", // Apple minimum touch target
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
MobileInput.displayName = "MobileInput";

/**
 * Mobile-optimized Textarea component
 */
const MobileTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-input",
        "bg-background px-4 py-3",
        // Mobile-first: 16px prevents iOS zoom
        "text-base md:text-sm",
        "ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
MobileTextarea.displayName = "MobileTextarea";

/**
 * Mobile-optimized Select component wrapper
 */
const MobileSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-12 w-full rounded-lg border border-input",
        "bg-background px-4 py-3",
        // Mobile-first: 16px prevents iOS zoom
        "text-base md:text-sm",
        "ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Touch-optimized
        "min-h-[44px]",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});
MobileSelect.displayName = "MobileSelect";

export { MobileInput, MobileTextarea, MobileSelect };