"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useState, useEffect, useRef } from "react"; // Import useRef
import { Search as SearchIcon } from "lucide-react";

interface SearchInputProps {
  placeholder: string;
}

export function SearchInput({ placeholder }: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const inputRef = useRef<HTMLInputElement>(null); // Create a ref for the input element

  // State to hold the input's current value
  const [inputValue, setInputValue] = useState<string>(searchParams.get("query") || '');

  // Effect to update inputValue when the URL search param changes (e.g., from filters or direct URL access)
  useEffect(() => {
    setInputValue(searchParams.get("query") || '');
  }, [searchParams]);

  // Effect to set focus on the input if there's an inputValue
  useEffect(() => {
    if (inputValue && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue]); // Re-run when inputValue changes

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Immer zur ersten Seite zurückkehren bei neuer Suche
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0 w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue} // Bind value to state
        onChange={(e) => {
          setInputValue(e.target.value); // Update local state immediately
          handleSearch(e.target.value); // Trigger debounced search
        }}
        ref={inputRef} // Attach the ref to the input element
        className="pl-10 pr-4 py-2 text-sm"
      />
      <SearchIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}