"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/mobile-utils";
import { Loader2 } from "lucide-react";

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  isLoading?: boolean;
  hapticFeedback?: "light" | "medium" | "heavy" | boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  label: string;
  subLabel?: string;
}

const variantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
  success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
  outline: "bg-transparent border-2 border-border text-foreground hover:bg-muted active:bg-muted/80",
};

const sizeClasses = {
  sm: "min-h-[44px] text-sm px-3",
  md: "min-h-[52px] text-base px-4",
  lg: "min-h-[60px] text-lg px-5",
  xl: "min-h-[72px] text-xl px-6",
};

export function TouchButton({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  isLoading = false,
  hapticFeedback = "medium",
  icon,
  iconPosition = "left",
  label,
  subLabel,
  className,
  disabled,
  onClick,
  children,
  ...props
}: TouchButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    if (hapticFeedback) {
      const style = hapticFeedback === true ? "medium" : hapticFeedback;
      triggerHapticFeedback(style);
    }

    onClick?.(e);
  };

  return (
    <button
      className={cn(
        // Base styles
        "relative flex flex-col items-center justify-center gap-0",
        "rounded-xl font-semibold transition-all duration-150",
        "select-none touch-manipulation",
        "-webkit-tap-highlight-color-transparent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",

        // Variant
        variantClasses[variant],

        // Size
        sizeClasses[size],

        // Full width
        fullWidth && "w-full",

        className
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className={cn("flex-shrink-0", subLabel ? "mb-1" : "mr-2")}>
              {icon}
            </span>
          )}
          <span className={cn("flex flex-col items-center leading-tight")}>
            <span>{label}</span>
            {subLabel && (
              <span className={cn("text-xs font-normal opacity-80")}>
                {subLabel}
              </span>
            )}
          </span>
          {icon && iconPosition === "right" && (
            <span className={cn("flex-shrink-0", subLabel ? "mb-1" : "ml-2")}>
              {icon}
            </span>
          )}
        </>
      )}
      {children}
    </button>
  );
}

/**
 * Compact icon-only touch button (circular)
 */
interface TouchIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  hapticFeedback?: "light" | "medium" | "heavy" | boolean;
  label: string; // Accessibility label
  icon: React.ReactNode;
}

const iconSizeClasses = {
  sm: "h-11 w-11",
  md: "h-13 w-13",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

export function TouchIconButton({
  variant = "ghost",
  size = "lg",
  isLoading = false,
  hapticFeedback = "medium",
  label,
  icon,
  className,
  disabled,
  onClick,
  ...props
}: TouchIconButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    if (hapticFeedback) {
      const style = hapticFeedback === true ? "medium" : hapticFeedback;
      triggerHapticFeedback(style);
    }

    onClick?.(e);
  };

  return (
    <button
      className={cn(
        "relative flex items-center justify-center rounded-full",
        "transition-all duration-150",
        "select-none touch-manipulation",
        "-webkit-tap-highlight-color-transparent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        iconSizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      aria-label={label}
      title={label}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <span className="flex items-center justify-center">{icon}</span>
      )}
    </button>
  );
}

/**
 * Full-width action button strip for mobile
 * Shows 2-3 large buttons side by side
 */
interface ActionStripProps {
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    variant?: TouchButtonProps["variant"];
    disabled?: boolean;
    isLoading?: boolean;
    onClick: () => void;
  }>;
  className?: string;
}

export function ActionStrip({ actions, className }: ActionStripProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        actions.length === 1 && "grid-cols-1",
        actions.length === 2 && "grid-cols-2",
        actions.length >= 3 && "grid-cols-3",
        className
      )}
    >
      {actions.map((action) => (
        <TouchButton
          key={action.id}
          variant={action.variant || "primary"}
          size="lg"
          fullWidth
          isLoading={action.isLoading}
          disabled={action.disabled}
          onClick={action.onClick}
          icon={action.icon}
          label={action.label}
        />
      ))}
    </div>
  );
}
