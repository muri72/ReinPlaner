"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface MarketingLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  showBackground?: boolean;
  backgroundVariant?: "default" | "gradient" | "dots";
  theme?: "dark" | "light";
  fullPage?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

const maxWidthMap = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "2xl": "max-w-[80rem]",
  full: "max-w-full",
};

const paddingMap = {
  none: "",
  sm: "px-4 py-6",
  md: "px-6 py-8",
  lg: "px-8 py-12",
  xl: "px-12 py-16",
};

export function MarketingLayout({
  children,
  className,
  maxWidth = "xl",
  padding = "lg",
  showBackground = true,
  backgroundVariant = "gradient",
  theme = "dark",
  fullPage = false,
  headerContent,
  footerContent,
}: MarketingLayoutProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col relative",
        isDark ? "section-dark" : "bg-slate-50"
      )}
    >
      {/* Background Effects */}
      {showBackground && isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {backgroundVariant === "gradient" && (
            <>
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
              <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px]" />
            </>
          )}
          {backgroundVariant === "dots" && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
          )}
        </div>
      )}

      {/* Header */}
      {fullPage && (
        <header
          className={cn(
            "relative z-10 border-b",
            isDark
              ? "border-white/10 bg-slate-900/50 backdrop-blur-md"
              : "border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0"
          )}
        >
          <div className={cn("mx-auto", maxWidthMap[maxWidth])}>
            {headerContent || (
              <div className="px-4 sm:px-6 py-4">
                <Link
                  href="/"
                  className={cn(
                    "inline-flex items-center gap-2 text-sm font-medium transition-colors",
                    isDark
                      ? "text-slate-200 hover:text-white"
                      : "text-slate-600 hover:text-blue-600"
                  )}
                >
                  ← Zurück zur Startseite
                </Link>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "relative flex-1 w-full mx-auto",
          maxWidthMap[maxWidth],
          paddingMap[padding],
          className
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {fullPage && footerContent && (
        <footer className={cn("relative z-10 border-t", isDark ? "border-white/10" : "border-slate-200")}>
          <div className={cn("mx-auto", maxWidthMap[maxWidth])}>
            {footerContent}
          </div>
        </footer>
      )}
    </div>
  );
}

export { maxWidthMap, paddingMap };