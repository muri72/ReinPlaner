"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
  className?: string;
}

export function Fab({ onClick, className }: FabProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 md:hidden",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
      aria-label="Neuen Eintrag erstellen"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}