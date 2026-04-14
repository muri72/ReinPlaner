"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: "fade" | "slide-up" | "slide-left" | "slide-right" | "scale";
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  once?: boolean;
  threshold?: number;
}

const delayClassMap: Record<number, string> = {
  0: "",
  1: "stagger-1",
  2: "stagger-2",
  3: "stagger-3",
  4: "stagger-4",
  5: "stagger-5",
  6: "stagger-6",
  7: "stagger-7",
  8: "stagger-8",
  9: "stagger-9",
  10: "stagger-10",
};

const animationClassMap = {
  fade: "animate-fade-in",
  "slide-up": "animate-fade-up",
  "slide-left": "animate-slide-in-left",
  "slide-right": "page-enter-right",
  scale: "count-up",
};

export const AnimatedSection = React.forwardRef<HTMLDivElement, AnimatedSectionProps>(
  ({ className, animation = "fade", delay = 0, once = true, threshold = 0.2, children, ...props }, _ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const internalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const element = internalRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setIsVisible(false);
          }
        },
        { threshold }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, [once, threshold]);

    return (
      <div
        ref={internalRef}
        className={cn(
          isVisible ? animationClassMap[animation] : "opacity-0",
          delayClassMap[delay],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AnimatedSection.displayName = "AnimatedSection";