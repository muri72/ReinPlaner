"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  linkHref?: string;
  valueColorClass?: string; // Tailwind class for value color (e.g., "text-green-500")
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
}

export function KpiCard({ title, value, description, icon: Icon, linkHref, valueColorClass, progress }: KpiCardProps) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm md:text-base font-semibold">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-xl md:text-2xl font-bold", valueColorClass)}>
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {progress && progress.total > 0 && (
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.label || `${progress.current} von ${progress.total} abgeschlossen`}
            </p>
          </div>
        )}
      </CardContent>
    </>
  );

  if (linkHref) {
    return (
      <Link href={linkHref} className="block">
        <Card className="shadow-neumorphic glassmorphism-card hover:scale-[1.02] transition-transform duration-200 ease-in-out cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      {content}
    </Card>
  );
}