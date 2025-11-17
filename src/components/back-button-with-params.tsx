"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonWithParamsProps {
  backUrl: string;
  searchParams?: { [key: string]: string | string[] | undefined };
  className?: string;
}

export function BackButtonWithParams({ backUrl, searchParams, className }: BackButtonWithParamsProps) {
  const router = useRouter();

  const handleBack = () => {
    // Try to use browser history first
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to the specified backUrl if no history
      router.push(backUrl);
    }
  };

  return (
    <Button variant="outline" onClick={handleBack} className={className}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      Zurück zur Übersicht
    </Button>
  );
}