"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder: string;
  className?: string;
}

export function SearchInput({ placeholder, className }: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string>(searchParams.get("query") || '');

  useEffect(() => {
    setInputValue(searchParams.get("query") || '');
  }, [searchParams]);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 200); // Reduced from 300ms for faster feedback

  const handleClear = () => {
    setInputValue('');
    const params = new URLSearchParams(searchParams);
    params.delete('query');
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          handleSearch(e.target.value);
        }}
        ref={inputRef}
        className={cn("pl-10 pr-10 w-full", className)}
      />
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      {inputValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-full p-0.5 hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}