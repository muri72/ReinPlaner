"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { replace } = useRouter();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex justify-center items-center space-x-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        onClick={() => replace(createPageURL(currentPage - 1))}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Vorherige Seite</span>
      </Button>

      <div className="flex space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            onClick={() => replace(createPageURL(page))}
            className={cn(
              "w-8 h-8",
              currentPage === page ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => replace(createPageURL(currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Nächste Seite</span>
      </Button>
    </div>
  );
}