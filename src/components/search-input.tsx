"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react"; // Import useState and useEffect

interface SearchInputProps {
  placeholder: string;
  onSearchChange: (term: string) => void; // New prop for debounced search term
  defaultValue?: string; // Allow initial value to be passed
}

export function SearchInput({ placeholder, onSearchChange, defaultValue }: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Local state to manage the input value
  const [inputValue, setInputValue] = useState(defaultValue || '');

  // Update local state when defaultValue changes (e.g., from URL on initial load)
  useEffect(() => {
    setInputValue(defaultValue || '');
  }, [defaultValue]);

  const handleDebouncedSearch = useDebouncedCallback((term: string) => {
    // Call the parent's callback with the debounced term
    onSearchChange(term);

    // Also update the URL for persistence/sharing
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Immer zur ersten Seite zurückkehren bei neuer Suche
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300); // 300ms debounce

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term); // Update local input state immediately
    handleDebouncedSearch(term); // Trigger debounced search
  };

  return (
    <div className="relative flex flex-1 flex-shrink-0 w-full"> {/* Ensure full width on small screens */}
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue} // Controlled component
        onChange={handleChange}
        className="pl-10 pr-4 py-2 text-sm" // Adjusted padding and text size for mobile-first
      />
      <SearchIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}