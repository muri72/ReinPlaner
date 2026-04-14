"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "interactive";
  glow?: "blue" | "cyan" | "violet" | "none";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const glowMap = {
  blue: "glow-blue",
  cyan: "glow-cyan",
  violet: "shadow-[0_0_40px_rgba(124,58,237,0.3)]",
  none: "",
};

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", glow = "none", padding = "md", children, ...props }, ref) => {
    const baseClass = variant === "interactive" ? "glass-card-hover" : "glass-card";
    
    const outlinedClass = variant === "outlined"
      ? "bg-white/80 border border-slate-200/60 shadow-sm"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          baseClass,
          paddingMap[padding],
          glowMap[glow],
          outlinedClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { paddingMap, glowMap };