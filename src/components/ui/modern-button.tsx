"use client";

import * as React from "react";
import { Button, buttonVariants, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModernButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "success" | "warning" | "danger";

export interface ModernButtonProps extends Omit<ButtonProps, "size" | "variant" | "disabled"> {
  variant?: ModernButtonVariant;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

const modernVariants: Record<ModernButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "glass-btn",
  ghost: "glass-btn hover:bg-white/10",
  outline: "glass-btn border-white/20 hover:border-white/40",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_15px_rgba(16,185,129,0.3)]",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-[0_4px_15px_rgba(245,158,11,0.3)]",
  danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_15px_rgba(244,63,94,0.3)]",
};

const sizeClasses = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-12 px-8 text-lg",
  xl: "h-14 px-10 text-xl",
};

export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ className, variant = "primary", size = "md", glow = false, pulse = false, icon, iconPosition = "left", loading, loadingText, children, disabled, ...props }, ref) => {
    const glowClass = glow ? "hover:shadow-[0_6px_30px_rgba(37,99,235,0.4)]" : "";
    const pulseClass = pulse ? "btn-pulse" : "";

    return (
      <Button
        ref={ref}
        className={cn(
          modernVariants[variant],
          sizeClasses[size],
          "font-semibold transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          glowClass,
          pulseClass,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{loadingText || "Laden..."}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
            {children}
            {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
          </>
        )}
      </Button>
    );
  }
);
ModernButton.displayName = "ModernButton";

export { modernVariants, sizeClasses };