"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic, X, Filter, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'suggestion';
  icon?: React.ReactNode;
}

interface MobileSearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  suggestions?: SearchSuggestion[];
  showVoiceSearch?: boolean;
  showFilterButton?: boolean;
  showHistory?: boolean;
  className?: string;
}

export function MobileSearchBar({
  placeholder = "Suchen...",
  value = "",
  onChange,
  onSearch,
  onFilter,
  suggestions = [],
  showVoiceSearch = false,
  showFilterButton = true,
  showHistory = true,
  className,
}: MobileSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (value.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleSearch = (query: string = value) => {
    onSearch?.(query);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange?.(suggestion.text);
    handleSearch(suggestion.text);
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'de-DE';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onChange?.(transcript);
      handleSearch(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleClear = () => {
    onChange?.("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            } else if (e.key === 'Escape') {
              handleClear();
            }
          }}
          className={cn(
            "h-12 md:h-10 w-full rounded-lg border border-input bg-background/60 backdrop-blur-sm px-10 pr-24 text-base md:text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
            "min-h-[44px]",
            isFocused && "ring-2 ring-primary ring-offset-2",
            className
          )}
        />

        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {showVoiceSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVoiceSearch}
              disabled={isListening}
              className={cn(
                "h-8 w-8 p-0",
                isListening && "text-red-500 animate-pulse"
              )}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}

          {showFilterButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilter}
              className="h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "flex items-center space-x-3 p-3 hover:bg-accent cursor-pointer transition-colors",
                index === 0 && "border-b border-border"
              )}
            >
              {suggestion.icon || (
                suggestion.type === 'recent' ? (
                  <History className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Search className="h-4 w-4 text-muted-foreground" />
                )
              )}
              <span className="flex-grow text-sm">{suggestion.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Voice Search Indicator */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <Mic className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Höre zu...</span>
          </div>
        </div>
      )}
    </div>
  );
}